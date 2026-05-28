# Phase 5: Realtime Events (Socket.IO)

Every inbound socket event follows the same five-step shape:

1. **Authenticate** the connection (session token attached on handshake — see phase 07).
2. **Parse** the payload with its Zod schema from `packages/shared/schemas`. Reject with `ErrorCode.invalid_*` on failure.
3. **Authorize**: is this session a member of the addressed room? Is the action allowed in the current stage? Is the player allowed to act now (turn ownership, not already locked, not rate-limited)?
4. **Dedup nonce**: `SADD room:{code}:nonces:{token}:{scope}` — if the add returns 0, the action was already processed. Re-ack with the same result.
5. **Run a transition** (phase 04) under the room lock; dispatch effects (broadcasts, timer changes, persist).

Handlers live one-per-file under `apps/server/src/sockets/`. The boilerplate above is implemented once in `apps/server/src/sockets/wrap.ts` so each handler reads as just the authorization checks plus a transition call.

## Connection lifecycle

```
apps/server/src/sockets/index.ts
```

- The Socket.IO server is mounted on the Fastify HTTP server (same listener, same port).
- On `connection`:
  1. Extract session token from the cookie (authoritative) or query string fallback.
  2. Reject if missing or unknown → emit `connect_error` with `session_invalid`.
  3. Read `session:{token}:room` from Redis. If set, look up `session:{token}:tab` and **demote the previous tab**:
     - Generate `tabId` for the new connection.
     - `SET session:{token}:tab tabId EX 60` (overwrites the previous).
     - If a previous socket exists for that token in the same instance, emit `tab_demoted` to it. (Cross-instance: the new tab takes ownership in Redis; the previous tab discovers via heartbeat that its tab id no longer matches and self-demotes.)
  4. `socket.join('room:'+code)` so subsequent broadcasts hit it.
  5. If the player was in disconnect-grace state, emit `player_reconnected` to both players and clear the disconnect timer.
  6. Send `room_state` with the per-recipient view.
- On `disconnect`:
  1. Mark the player `connected: false` in room state.
  2. Schedule the stage-appropriate disconnect grace timer.
  3. Pause the action timer they own (their secret deadline, their turn timer, their RPS deadline).
  4. Broadcast `player_disconnected` to the room with `graceRemainingSeconds`.

## Rate limits

Enforced before authorization to protect the lock:

| Limit | Scope | Backing | Effect |
| --- | --- | --- | --- |
| 100 msgs/min | per session, all events | `ratelimit:msg:{token}` sorted set | Drop event silently; emit `msg_rate_limited` ack once per minute |
| 5 emotes / 30s | per session per room | `room:{code}:emotes:{token}` sorted set | `emote_rate_limited` ack |
| 20 resubmits/round | simultaneous mode, per player per round | `room:{code}:resubmits:{token}:{round}` int | `submit_rate_limited` ack |

The global 100/min check is the first thing the wrapper does (before parse) so malformed traffic still counts.

---

## Inbound handlers

### `room:leave`

- **Handler**: `sockets/room-leave.ts`
- **Schema**: `{ nonce }`
- **Valid stages**: `waiting`–`playing`
- **Authorization**: session is a room member
- **Behavior**:
  - `waiting` (creator alone) → close room, emit `room_closed`.
  - `lobby` → if creator leaves, close room (joiner is shown "The room creator left"); if joiner leaves, revert to `waiting`, emit `room_joined` with `joiner: null` to creator.
  - `secrets`/`rps`/`playing` → treated as voluntary forfeit. Same effect as `forfeit` handler.
- **Ack**: `{ ok: true }`

### `room:kick_joiner`

- **Schema**: `{ nonce }`
- **Valid stages**: `lobby`
- **Authorization**: only the creator may invoke
- **Behavior**: remove joiner; revert to `waiting`. Send the kicked player a special `room_closed` payload with `reason: 'kicked'` so their client routes them to home with the correct message.
- **Ack**: `{ ok: true }` to creator

### `room:toggle_ready`

- **Schema**: `{ nonce, ready: boolean }`
- **Valid stages**: `lobby`
- **Behavior**: set `player.ready = ready`. Broadcast `player_ready`. If both ready → transition to `secrets`, broadcast `match_started` shell payload (`firstTurnPlayer` set later when secrets are locked or `rps` resolves — see how the spec uses `match_started`; we emit it now as the "we're past the lobby" signal, then re-emit on `playing` start with `firstTurnPlayer`). *Two-emit pattern documented because both clients need a clear "lobby is over, secrets begin" cue.*
- **Ack**: `{ ok: true, ready }`

### `room:reclaim_tab`

- **Schema**: `{ nonce }`
- **Behavior**: this tab takes over. Set `session:{token}:tab` to this tab id; emit `tab_demoted` to whichever socket currently holds it. Send `room_state` to the reclaiming socket.
- **Ack**: `{ ok: true }`

### `secret:submit`

- **Schema**: `{ nonce, value: string }`
- **Valid stages**: `secrets`
- **Authorization**: room member; not yet locked.
- **Validation**: `validateNumber(value, settings.number)` from phase 03. On failure → `secret_invalid` ack with the failing rule code.
- **Behavior**: store secret server-side; clear that player's secret deadline. Broadcast `secret_locked` with `playerToken` only (no value). If both secrets locked → transition to `rps` or `playing` per `firstTurn` rule; emit `match_started` (now with `firstTurnPlayer` if known).
- **Ack**: `{ ok: true }`

### `rps:pick`

- **Schema**: `{ nonce, pick: RPSPick }`
- **Valid stages**: `rps`
- **Authorization**: room member; not yet locked this round.
- **Behavior**: store pick. Broadcast `rps_picked` (token only). When both locked, resolve via `game/rps.ts`:
  - If `winner`: set `firstTurnPlayer`, transition to `playing`, broadcast `rps_resolved` with both picks revealed and `winner`.
  - If `tie` and `rpsRound < 3`: broadcast `rps_resolved` with `winner: 'tie'` and `willReplay: true`, advance round, clear picks, reset 10s deadline.
  - If `tie` at round 3: pick random first-turn player; broadcast `rps_resolved` with `willReplay: false`; transition to `playing`.
- **Ack**: `{ ok: true }`

### `guess:submit`

- **Schema**: `{ nonce, value: string }`
- **Valid stages**: `playing`
- **Authorization (alternating)**: `state.match.activeTurnPlayer === senderToken`. Otherwise `not_your_turn`.
- **Authorization (simultaneous)**: room member; `roundResubmits[token] < 20`. Otherwise `submit_rate_limited`.
- **Validation**: `validateNumber(value, settings.number)`. On failure → `guess_invalid`; in alternating mode the turn does **not** consume (timer keeps running). In simultaneous mode the resubmit counter increments.
- **Behavior (alternating)**:
  - Score via `scoreGuess(value, opponentSecret)`.
  - Append a `GuessLogEntry`.
  - Broadcast `guess_submitted` (token + turnIndex) then `result_calculated` (the new entry).
  - If `isAllBulls(result, settings.number.length)` → outcome = winner (sender), reason = `solved`. Transition to `ended`.
  - Else → flip `activeTurnPlayer`, reset `turnDeadline`, increment `turnIndex`, broadcast `turn_changed`.
- **Behavior (simultaneous)**:
  - Store `{ value, submittedAt }` in `roundSubmissions[token]`. Increment `roundResubmits[token]`.
  - Broadcast `guess_submitted` (token + roundIndex). No score yet.
  - The round timer is the only thing that triggers scoring (see `engine.ts` tick handler).
- **Ack**: `{ ok: true }`

### `forfeit`

- **Schema**: `{ nonce }`
- **Valid stages**: `secrets`, `rps`, `playing`
- **Behavior**: transition to `ended` with `outcome = { kind: 'winner', winner: opponent, reason: 'voluntary' }`. Broadcast `forfeit_declared` then `match_ended` (with secrets revealed).
- **Ack**: `{ ok: true }`

### `emote:send`

- **Schema**: `{ nonce, code: EmoteCode }`
- **Valid stages**: `lobby`–`ended`
- **Rate limit**: 5/30s per `room:{code}:emotes:{token}` sorted set
- **Behavior**: broadcast `emote_sent` to **both** players. Receiver clients check their own `mute` state to drop it. *Server does not honor mute — it's a client-side filter only* (per requirement: the opponent does not see whether they've been muted, so the server can't condition delivery on it).
- **Ack**: `{ ok: true }`

### `mute:toggle`

- **Schema**: `{ nonce, muted: boolean }`
- **Behavior**: store in `session:{token}:mutedIn` (add/remove room code from set). Used for cross-tab continuity. **Not broadcast** to the opponent.
- **Ack**: `{ ok: true }`

### `rematch:offer`

- **Schema**: `{ nonce }`
- **Valid stages**: `ended`
- **Behavior**: mark this session as having offered. Broadcast `rematch_offered` to the room.
  - If the other player has already offered → equivalent to accept. Transition into the rematch setup (next section).
- **Ack**: `{ ok: true }`

### `rematch:respond`

- **Schema**: `{ nonce, accept: boolean }`
- **Behavior**:
  - `accept: true` → broadcast `rematch_accepted`, then transition the room: reset `match`, swap `settings.firstTurn` if `creator` or `joiner`, set stage to `secrets`, set fresh 60s secret deadlines. Emit a `room_state` with the new view.
  - `accept: false` → broadcast `rematch_declined`. The offering player's client transitions to "only Back to Home available."
- **Ack**: `{ ok: true }`

### `state:request`

- **Schema**: `{ nonce }`
- **Behavior**: build `toRoomStateView(state, senderToken)` and reply via ack. Used by clients on socket reconnect or page visibility regain.
- **Ack**: `{ ok: true, state: RoomStateView }`

---

## Outbound emits — when they fire

| Event | Trigger | Recipients | Notes |
| --- | --- | --- | --- |
| `room_created` | After `POST /rooms` returns; sent via the creator's socket after they connect to the room | creator only | The HTTP response already contained the room shell; this event syncs the socket-side cache |
| `room_joined` | Joiner commits via socket after preview (see HTTP `GET /rooms/:code` flow in phase 06) | both | |
| `player_ready` | `room:toggle_ready` | both | |
| `match_started` | Lobby → secrets transition AND secrets → playing transition (re-emitted with `firstTurnPlayer`) | both | Two emissions, distinguishable by presence of `firstTurnPlayer` |
| `secret_locked` | `secret:submit` success | both | |
| `rps_picked` | `rps:pick` success | both | Token only |
| `rps_resolved` | Both picks in OR 10s expiry | both | Both picks visible |
| `guess_submitted` | `guess:submit` success | both | Token + index; values come via `result_calculated` |
| `result_calculated` | Alt: after guess scored. Sim: at round timer fire | both | Always paired with the matching `guess_submitted` |
| `turn_changed` | Alt: turn flip. Sim: round advanced | both | `activePlayer: null` in simultaneous |
| `timeout_strike` | Timer fire without submission | both | |
| `forfeit_declared` | `forfeit`, 3-strike, secret_timeout, disconnect_grace expiry | both | Preceded by `timeout_strike` if applicable |
| `match_ended` | Any terminal transition to `ended` | both | Secrets revealed in payload |
| `player_disconnected` | Socket disconnect for a known room member | both | Includes `graceRemainingSeconds` |
| `player_reconnected` | Socket reconnect within grace | both | |
| `emote_sent` | `emote:send` success | both | |
| `rematch_offered` | `rematch:offer` | both | |
| `rematch_accepted` | `rematch:respond accept=true` OR both-offered | both | Followed by `room_state` for the new match shell |
| `rematch_declined` | `rematch:respond accept=false` | both | |
| `tab_demoted` | New connection takes over the room slot | previous tab only | |
| `room_state` | Initial connection, reconnect, rematch start, `state:request` | recipient only | |
| `room_closed` | Cancel, creator-AFK expiry, kick, abandoned-cleanup, idle | applicable recipients | `reason` field varies |

## Broadcast scope helpers

- `io.to('room:'+code).emit(...)` — both players (and the `tab_demoted`-shadowed socket, which will ignore).
- `socket.to('room:'+code).emit(...)` — opponent only (sender excluded).
- Direct `socket.emit(...)` to a specific socket id — used for tab-specific events (`tab_demoted`, `room_state`).

## Anti-cheat checklist for every handler

- [ ] Server re-validates the payload via the shared Zod schema.
- [ ] No outbound payload includes the opponent's secret while `stage ∈ {lobby, secrets, rps, playing}`.
- [ ] Turn / round ownership checked against authoritative state (not the client's claim).
- [ ] Nonce dedup applied for every mutation event.
- [ ] Rate limits checked before doing real work.
- [ ] All broadcasts derived from `toRoomStateView` or explicit field allow-lists — no `state.match` spread into payloads.

## Acceptance for phase 5

- [ ] One handler file per event under `apps/server/src/sockets/`.
- [ ] The wrapper (parse → authorize → dedup → lock → transition → dispatch) is applied uniformly.
- [ ] No socket handler writes to Redis outside `store.save(...)` calls dispatched from transitions.
- [ ] All event names match `packages/shared/events` exactly — no string drift.
- [ ] Reconnection emits `player_reconnected` and a fresh `room_state` with paused timers correctly resumed.
- [ ] Tab takeover emits `tab_demoted` to the previous tab and a `room_state` to the new one.
