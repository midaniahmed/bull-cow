# Phase 2: Data Model

Two storage tiers, with strict roles:

- **Redis (Upstash)** — the *authoritative* hot store during a match. Every read/write the match engine performs goes through Redis. The in-process Node memory holds short-lived caches and the active timer wheel, but if the process dies, Redis is the source of truth for crash recovery.
- **PostgreSQL (Neon) via Drizzle** — durable record of *completed* matches. The MVP doesn't need stats, so the schema is minimal. We keep it because (a) abandoned/ended snapshots need to survive Redis TTLs for the ~10-minute post-match window, and (b) it's the foundation accounts will sit on later.

## Postgres (Drizzle) — `apps/server/src/db/schema.ts`

### `matches`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `room_code` | text | indexed, NOT NULL | Not unique — same room can host rematches |
| `creator_session_token` | text | NOT NULL | |
| `joiner_session_token` | text | NOT NULL | |
| `creator_nickname` | text | NOT NULL | Snapshot — players can edit later |
| `joiner_nickname` | text | NOT NULL | Snapshot |
| `settings` | jsonb | NOT NULL | Full `RoomSettings` snapshot |
| `secrets` | jsonb | NOT NULL | `{ [sessionToken]: string }` — finalized; only written on `ended`/`abandoned` |
| `guess_log` | jsonb | NOT NULL | `GuessLogEntry[]` |
| `outcome` | jsonb | NOT NULL | `Outcome` discriminated union |
| `started_at` | timestamptz | NOT NULL | |
| `ended_at` | timestamptz | NOT NULL | |

Indexes:
- `(room_code, ended_at DESC)` — list rematches in a room for the head-to-head score panel.
- `(creator_session_token)` and `(joiner_session_token)` — used by the future stats feature; cheap to add now.

Notes:
- No `rooms` table. Rooms only exist in Redis during their lifetime; once they end, the `matches` row replaces them.
- `secrets` is written **only** on terminal stage (`ended` or `abandoned`). No row exists for in-progress matches.
- Abandoned matches still get a row so a returning player gets a deterministic "this match was abandoned" view.

### Migration plan

- **Name**: `0001_init_matches`
- **Backfill**: none (greenfield).
- **Destructive**: no — initial schema.

## Redis (Upstash) — key layout

All keys are namespaced under `bc:` (Bulls & Cows) so this Upstash instance can be shared if needed. Pattern shown without the prefix for brevity.

### Session keys

| Key | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `session:{token}` | hash | 30 days, refreshed on activity | `{ nickname, createdAt, lastSeenAt }` |
| `session:{token}:room` | string (room code) | follows the room's TTL | Multi-presence: which room this session is currently in |
| `session:{token}:tab` | string (tabId) | 60s, refreshed by heartbeat | Active tab id for the current room |
| `session:{token}:mutedIn` | set of room codes | follows the room's TTL | Which rooms the session has muted emotes in |

### Room keys

| Key | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `room:{code}` | hash | varies by stage (see lifetimes) | Authoritative room state — see fields below |
| `room:{code}:guess_log` | list (JSON entries) | matches `room:{code}` | Append-only ordered log |
| `room:{code}:rematch_history` | list (JSON entries) | matches `room:{code}` | Past match outcomes for head-to-head |
| `room:{code}:nonces:{token}:{scope}` | set | scope-dependent | Replay dedup; scope is e.g. `secret`, `rps:{round}`, `guess:{turn}`, `emote`, `rematch` |
| `room:{code}:emotes:{token}` | sorted set (ts) | 60s | Sliding window for the 5/30s emote limit |
| `room:{code}:resubmits:{token}:{round}` | string (int) | matches round timer | Simultaneous-mode 20-resubmits-per-round limit |
| `room:{code}:rps:{round}` | hash | matches `room:{code}` | `{ [token]: pick }` |
| `room:{code}:disconnects` | hash | matches `room:{code}` | `{ [token]: { graceEndsAt, lastStage } }` |

### Room hash fields

`room:{code}` stores:

```
code              : string
stage             : RoomStage
settings          : json
creator           : json   { sessionToken, nickname, ready, strikes, connected }
joiner            : json | null
secrets           : json   { [token]: string } — server-only, NEVER serialized to opponent
secretsLockedAt   : json   { [token]: timestamp | null }
secretDeadline    : json   { [token]: timestamp | null }
firstTurnPlayer   : string | null
activeTurnPlayer  : string | null
turnIndex         : int
roundIndex        : int | null            (simultaneous mode)
turnDeadline      : timestamp | null
rpsRound          : int | null
turnSystem        : 'alternating' | 'simultaneous'
endedOutcome      : json | null
endedAt           : timestamp | null
createdAt         : timestamp
```

### Rate limit / cross-cutting keys

| Key | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `ratelimit:msg:{token}` | sorted set | 60s | Global 100 msgs/min cap |
| `roomcodes:active` | set | none (manual lifecycle) | Used during code generation to detect collisions |

### Pub/sub

The Socket.IO Redis adapter uses its own internal channels — these are not application-visible keys but they share the same Redis instance.

## Key lifetimes (TTLs)

| Stage transition | Action on `room:{code}` and sidecars |
| --- | --- |
| `waiting` (creator created) | TTL = 6 minutes (covers 5-min creator AFK + buffer); refreshed on every action |
| `lobby` | TTL = 5 minutes; refreshed on activity |
| `secrets` / `rps` / `playing` | TTL = 10 minutes; refreshed on every action and tick |
| `ended` | TTL = 10 minutes (the "post-match idle" window) |
| `abandoned` | TTL = 10 minutes (so returning players see the abandoned screen) |
| Manual close (cancel, kick last player, abandoned-after-cleanup) | DEL all `room:{code}*` keys and the active-codes set entry |

A background "janitor" Cron sweep is **not** required — Redis TTLs handle eviction. The match engine refreshes TTL on every authoritative write so an active room never expires mid-play.

## Concurrency model

Even with a single Node instance, every room operation goes through a per-room async lock to serialize state transitions. The lock implementation in MVP is in-memory (an `AsyncLock` keyed by room code) since we run one instance.

If horizontal scale becomes needed later:
- Add a Redis-based lock per room (`SET room:{code}:lock token NX PX 5000`).
- The Socket.IO Redis adapter already handles cross-instance broadcast.
- No schema change required.

## Data the server never sends to the opponent (until terminal)

These live in Redis but are explicitly *excluded* from every outbound socket payload until stage is `ended` or `abandoned`:

- `room:{code}.secrets[opponentToken]`
- `room:{code}.rps:{round}` — the opponent's pick (only `locked` boolean is exposed)
- Any internal timer wheel keys

A serialization helper (`toRoomStateView(roomState, recipientToken)`) is the single place where this filtering happens — see phase 04.

## Notes

- The hot path runs entirely in Redis + in-memory locks. Postgres is touched once per completed match (one `INSERT` on `match_ended` / `room_closed`).
- Drizzle's connection pool is small (5 connections) since write volume is low.
- All timestamps are server-issued `Date.now()` values, formatted as ISO-8601 on the wire.

## Acceptance for phase 2

- [ ] `matches` table created; no other Postgres tables added in MVP.
- [ ] Every Redis key has a documented TTL and a written-by/read-by pair.
- [ ] No secret values appear in any key that is serialized to the opponent.
- [ ] `roomcodes:active` is updated atomically when a room is created and freed when it closes.
- [ ] Per-room lock prevents concurrent state transitions within a single Node instance.
