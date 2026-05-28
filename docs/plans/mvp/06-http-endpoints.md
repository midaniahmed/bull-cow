# Phase 6: HTTP Endpoints (Fastify)

HTTP exists for the things that happen *outside* an active match: session bootstrap, nickname management, room creation, code resolution before commit, and health. Once a player is inside a room, sockets carry everything.

The Fastify server and the Socket.IO server share one HTTP listener, one port, one cookie jar.

```
apps/server/src/routes/
├── session.ts        # POST /session, PATCH /session
├── rooms.ts          # POST /rooms, GET /rooms/:code
├── health.ts         # GET /health
└── index.ts          # plugin registration
```

All routes use `fastify.withTypeProvider<ZodTypeProvider>()` so the same Zod schemas from `packages/shared` provide both runtime validation and TypeScript types.

---

## `POST /session`

Issue or refresh a session for an anonymous visitor; bind a nickname.

- **Handler**: `routes/session.ts → postSession`
- **Request body (Zod)**: `{ nickname: NicknameSchema }`
- **Auth**: none (this *creates* identity).
- **Behavior**:
  1. Read existing `bc_session` cookie. If valid and the session exists in Redis, update `lastSeenAt`; treat as "returning visitor" and respond with the existing token.
  2. Otherwise generate a new opaque token (32 bytes URL-safe base64).
  3. `HSET session:{token} nickname <…> createdAt <…> lastSeenAt <…>` with TTL 30 days.
  4. Set cookie `bc_session = token` with `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30d`.
- **Response 200**: `{ sessionToken, nickname }` (token sent in body too so the client can also stash in localStorage per the multi-storage rule).
- **Response 400**: `nickname_invalid`.
- **Idempotent**: yes — same caller calling twice returns the same token and updates the nickname.

## `PATCH /session`

Change the user's nickname (the "Edit" affordance on the home screen).

- **Request body (Zod)**: `{ nickname: NicknameSchema }`
- **Auth**: session cookie required.
- **Behavior**: update `session:{token}.nickname`. If the user is currently in a room (`session:{token}:room` is set), the room state's player nickname is **not** automatically updated — once a match starts, nicknames are snapshotted; pre-match they can change.
  - Implementation detail: while `stage ∈ {waiting, lobby}`, the route also updates the room hash and broadcasts a `room_state` over sockets. Once in `secrets` or later, the route only updates the global session record.
- **Response 200**: `{ sessionToken, nickname }`.
- **Response 401**: `session_invalid`.
- **Response 400**: `nickname_invalid`.

## `POST /rooms`

Create a new room with custom settings. The creator must already have a session.

- **Request body (Zod)**: `RoomSettingsSchema` (composition from phase 01).
- **Auth**: session cookie required.
- **Behavior**:
  1. Check `session:{token}:room`. If set → respond `409 room_other_active` with `{ existingRoom: code }` so the client can show the "Leave current room and continue?" prompt.
     - The client's confirmation path calls `DELETE /rooms/{code}/membership` (next section) to leave, then retries this POST.
  2. Validate the settings refinement (length feasibility per phase 03). Reject `400 settings_invalid` with `field` on failure.
  3. Generate a room code via `generateRoomCode(crypto.randomBytes)`. Retry up to 5 times against `SISMEMBER roomcodes:active`. If still colliding → `500 internal` (vanishingly unlikely with 31^6 codes).
  4. `SADD roomcodes:active code`.
  5. Build initial `RoomState` (stage = `waiting`, creator populated, joiner null).
  6. Save under `room:{code}` with the `waiting`-stage TTL.
  7. Set `session:{token}:room = code`.
- **Response 201**: `{ room: RoomPublic, joinUrl: '/room/{CODE}' }`.
- **Response 400**: `settings_invalid` with field.
- **Response 409**: `room_other_active` with `existingRoom`.
- **Response 401**: `session_invalid`.
- **Side effects**: a `room_created` socket event is emitted to the creator after they open their socket (see phase 05); the HTTP response is the kickoff signal.

## `DELETE /rooms/:code/membership`

Leave the currently-in-progress room. Used by the "Leave current and continue" confirmation flow.

- **Auth**: session cookie required.
- **Behavior**: equivalent to the `room:leave` socket event (phase 05). Routed over HTTP for cases where the client isn't connected to the room socket (e.g., already on the home page, but Redis still has `session:{token}:room` set from a tab they closed without graceful disconnect).
- **Response 200**: `{ ok: true }`.
- **Response 404**: `room_not_found` (the session wasn't in any room — treated as success-equivalent; client retries the join/create).

## `GET /rooms/:code`

Resolve a room code for the **join preview** — does not yet add the caller as a joiner.

- **Path param**: `code: RoomCodeSchema` (server normalizes lowercase → uppercase; rejects invalid charset).
- **Auth**: session cookie required (so we can detect "you are already in this room").
- **Behavior**:
  1. Load `room:{code}`.
  2. Not found → `404 room_not_found`.
  3. If `state.stage !== 'waiting'`:
     - `lobby`/`secrets`/`rps`/`playing` → `409 room_in_progress`.
     - `ended`/`abandoned` → `410 room_ended`.
  4. If joiner slot is filled and the caller isn't the existing joiner → `409 room_full`.
  5. If caller is the creator → `409 room_already_member`.
  6. Otherwise respond with the preview view.
- **Response 200**: `{ room: { code, settings, creator: PlayerPublic, createdAt } }`.

The response intentionally omits `joiner`, `stage`, and any match data — it's a preview.

The actual *commit-to-join* happens over the socket once the client opens the room URL. See "Join commit flow" below.

## `GET /health`

- **Response 200**: `{ status: 'ok', uptimeSeconds, version, redis: 'ok'|'degraded', db: 'ok'|'degraded' }`.
- **Use**: deploy platform health checks; nothing else. No auth.

---

## Join commit flow (HTTP + socket handshake)

Joining is split across HTTP and socket because:
- The preview lookup must not commit (HTTP `GET`).
- Commit needs the player's live socket so it can immediately broadcast `room_joined`.

Resulting flow:

1. Joiner lands on `/room/{CODE}` page.
2. Frontend calls `GET /rooms/{CODE}` to fetch the preview.
3. UI shows preview screen with **Join Match** / **Cancel**.
4. On **Join Match**:
   - Client opens the room socket with the room code in the query (so the server knows the intended room before any event).
   - Server's `connection` handler sees: existing room, joiner slot open, no `session:{token}:room` (or it matches — see below).
   - Server runs the commit transition under the room lock: sets `joiner`, transitions stage to `lobby`, sets `session:{token}:room = code`, broadcasts `room_joined`.

If `session:{token}:room` is set to a *different* room when the joiner opens the socket, the server emits `connect_error` with `room_other_active`. The client surfaces the same "Leave current and continue?" confirmation as the create flow and calls `DELETE /rooms/:code/membership` before retrying.

---

## CORS, cookies, and base URL

- `apps/server` runs behind the same origin as `apps/web` in production (no CORS needed). In dev, the Vite proxy forwards `/api/*` and the socket path.
- `bc_session` cookie: `HttpOnly`, `Secure` (in prod), `SameSite=Lax`, `Path=/`. The 30-day expiration covers the spec's "long-lived" requirement.
- The socket handshake reads the cookie via `socket.handshake.headers.cookie` — authoritative source for session identity.

## Idempotency

- `POST /session` is idempotent on a returning visitor (same cookie → same token).
- `POST /rooms` is **not** idempotent — repeated calls create new rooms. The client must protect against double-submit (the Create button must disable on first click).
- `DELETE /rooms/:code/membership` is idempotent — leaving a room you're not in is a no-op.

## Error codes (HTTP → enum)

| HTTP | `ErrorCode` from phase 01 |
| --- | --- |
| 400 | `nickname_invalid`, `settings_invalid` |
| 401 | `session_invalid` |
| 403 | `forbidden` |
| 404 | `room_not_found` |
| 409 | `room_full`, `room_in_progress`, `room_already_member`, `room_other_active` |
| 410 | `room_ended` |
| 429 | `msg_rate_limited` |
| 500 | `internal` |

All non-2xx responses share a shape: `{ ok: false, code, message, field? }`.

## Acceptance for phase 6

- [ ] All routes use the shared Zod schemas; no per-route validation logic.
- [ ] `POST /rooms` enforces the "one room at a time" rule via Redis, not via in-memory state.
- [ ] `GET /rooms/:code` returns *only* the preview — no joiner, no stage, no match data.
- [ ] The session cookie is `HttpOnly` in all responses.
- [ ] The `roomcodes:active` set is updated atomically with `room:{code}` creation, and freed on close.
