# Phase 7: Auth & Session

There are no accounts in MVP. Identity is a single server-issued opaque token. Everything that looks like "auth" is actually presence enforcement, multi-tab management, and rate limiting against that token.

## Session token

- **Format**: 32-byte URL-safe base64 (`crypto.randomBytes(32).toString('base64url')`), ~43 chars. Opaque to the client.
- **Issuance**: `POST /session` (phase 06) on first contact. Server creates `session:{token}` in Redis with the nickname and timestamps.
- **Storage** (per requirement):
  - `HttpOnly; Secure; SameSite=Lax` cookie named `bc_session`, `Path=/`, `Max-Age=30d`. **Authoritative for the socket handshake.**
  - `localStorage['bc_session_token']` mirror. Cross-tab continuity, also lets the client confirm "yes I have a session" before making any API call.
- **When both diverge**: cookie wins. The client always reconciles localStorage to whatever the cookie/server says.
- **Eviction**: clearing browser data drops both. Server still has the row in Redis but no client can present it, so the user is effectively a new visitor.
- **Rotation**: never in MVP. Tokens are long-lived and bound to no PII.
- **Renewal**: every successful request touches `session:{token}.lastSeenAt` and refreshes the Redis TTL. Cookies are refreshed by Fastify's `cookie` plugin on every response.

## Nickname

- Bound to the session token in `session:{token}.nickname`.
- Validated by `NicknameSchema` (2–20 chars, allowed charset) — both at `POST /session` and `PATCH /session`.
- Snapshotted into the room state when a player joins (in `PlayerState.nickname`). Pre-match, nickname edits propagate to the room hash and re-broadcast. From `secrets` onward, the snapshotted nickname is what shows in payloads for the rest of the match.

## Multi-presence enforcement

The "one session token = one active room and one active tab" invariant is enforced via Redis keys, not via in-memory bookkeeping.

### One room at a time

- Key: `session:{token}:room` — string of the active room code.
- Set when a session creates or joins a room.
- Cleared when the room ends or the session leaves.
- `POST /rooms` and the socket `connection` handler for a different room both check this key. Mismatch → reject with `room_other_active` and pass back the existing room code.
- Client surfaces a "Leave current room and continue?" modal. Confirm → `DELETE /rooms/:code/membership` (phase 06) → retry. Cancel → no-op.

#### Leaving a room when the session is in a match

The leave path is stage-dependent:
- `waiting` → close room.
- `lobby` → joiner: revert to waiting; creator: close room.
- `secrets`/`rps`/`playing` → counted as a **voluntary forfeit** (`outcome.reason = 'voluntary'`).

This rule is identical whether the leave came over HTTP or socket.

### One active tab per room

- Key: `session:{token}:tab` — string of the active tab's id, 60s TTL refreshed by socket heartbeat.
- The socket `connection` handler:
  1. Generates a new tab id for the connecting socket.
  2. `SET session:{token}:tab <newTabId> EX 60` (unconditional overwrite — newer wins, per requirement).
  3. If the previous tab is connected to *this* Node instance, emit `tab_demoted` to it directly.
  4. Cross-instance: the previous tab's heartbeat (`state:request` every 25s) will discover its tab id no longer matches and self-demotes locally. **The frontend keeps a record of "my tab id"** and only acts when it matches the server's view.
- Reclaiming an old tab: user clicks the banner; client sends `room:reclaim_tab` over socket. Server overwrites `session:{token}:tab` again; the previously-live tab gets a `tab_demoted` event.
- Demoted tabs go **read-only** — the client refuses to send any mutating event. They still receive broadcasts so the read-only display stays current.

### Two devices, same session token

The "newer tab wins" rule trivially extends: opening the room URL on device B claims the tab key, demoting device A's socket to read-only. The two cannot act simultaneously.

## Rate limits

All limits are server-enforced. Client may mirror for UX but is never trusted.

### Global socket rate (100 msgs/min per session)

- Key: `ratelimit:msg:{token}` — sorted set keyed by ms timestamp.
- On every inbound event:
  - `ZREMRANGEBYSCORE … 0 (now-60_000)` to evict old entries.
  - `ZCARD` to count remaining.
  - If `>= 100`: silently drop the event and respond with `msg_rate_limited` ack (the client may use the ack to back off).
  - Else: `ZADD … now nonce` and proceed.
- Implemented in the socket wrapper (phase 05) so even malformed events count against the budget.

### Emote rate (5 / 30s per session per room)

- Key: `room:{code}:emotes:{token}` — sorted set, same pattern as above with a 30s window.
- Enforced inside the `emote:send` handler before any broadcast.
- Limit exceeded → `emote_rate_limited` ack, no broadcast. Client's `useEmoteRateLimit` hook may also disable the panel until the window slides.

### Simultaneous-mode resubmits (20 / round per player)

- Key: `room:{code}:resubmits:{token}:{round}` — string int with TTL matching the round.
- Incremented atomically (`INCR`) inside the `guess:submit` handler for simultaneous mode.
- Hitting 20 returns `submit_rate_limited`; the player must wait for the round timer to elapse.

### Nonce dedup (anti-replay)

- Distinct from rate limits but same plumbing.
- Key: `room:{code}:nonces:{token}:{scope}` — set of nonces seen this scope.
- Scopes (intentionally narrow so memory stays bounded):
  - `secret` — survives the secrets stage only.
  - `rps:{round}` — survives one RPS round.
  - `guess:{turn}` (alternating) or `guess:round:{round}` (simultaneous).
  - `emote` — sliding 60s set.
  - `rematch` — survives the post-match window.
- `SADD` returns 0 → action already processed; the wrapper re-acks success (idempotent).

## Cookies

| Cookie | Set by | Read by | Lifetime |
| --- | --- | --- | --- |
| `bc_session` | `POST /session`, refreshed on every Fastify response | every HTTP route, every socket handshake | 30d sliding |

No other cookies. No CSRF token in MVP because there are no cross-origin mutation flows (the API and the SPA share an origin in production, and the socket handshake additionally requires the cookie which `SameSite=Lax` won't expose to cross-site fetches).

## Accounts later (future-scope hook)

The token contract is designed so accounts are an *additive* layer:

- A future `account_id` in Postgres has 0..n associated session tokens.
- A logged-in user's session token is upgraded — same token, now linked to an account.
- Guests with no account continue to work unchanged. No client refactor.

The requirements state this explicitly (`00-overview.md` § Future Scope): "the existing guest session-token flow must continue to work — accounts are an additive layer."

## Acceptance for phase 7

- [ ] Session tokens are issued only by `POST /session`; no other endpoint mints them.
- [ ] `bc_session` cookie is `HttpOnly`, `Secure` in prod, `SameSite=Lax`, `Path=/`, `Max-Age=30d`.
- [ ] `session:{token}:room` is set/cleared at every room enter/leave boundary; no orphan rows.
- [ ] Newest tab claims `session:{token}:tab`; old tab receives `tab_demoted` (in-instance) or self-demotes on next heartbeat (cross-instance).
- [ ] The three rate-limit windows are enforced in Redis with the documented keys; no in-memory counters.
- [ ] Every mutating socket event is dedup'd via nonce against the per-room nonce set.
