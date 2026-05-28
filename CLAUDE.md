# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

The MVP scaffold is in place. The repo is a pnpm monorepo:

- `packages/shared` — Zod schemas, shared types, event-name constants, pure game logic (score, validate, RPS, room-code generation).
- `apps/server` — Fastify (HTTP) + Socket.IO (realtime), Drizzle/Postgres (durable matches), Redis (hot room state, rate limits, presence).
- `apps/web` — React 18 + Vite + Tailwind + Zustand + Socket.IO client; mobile-first PWA.

The full MVP plan lives under `docs/plans/mvp/`. The product spec lives in `bulls_and_cows_pvp_spec.md`.

## Common commands

Run from the repo root unless noted:

```bash
pnpm install                  # install workspace deps
pnpm dev                      # start server + web together (parallel)
pnpm dev:server               # start server only (port 8787)
pnpm dev:web                  # start web only (port 5173)

pnpm typecheck                # tsc --noEmit across all packages
pnpm build                    # build shared → server → web

pnpm db:generate              # drizzle-kit generate (writes /apps/server/drizzle)
pnpm db:migrate               # apply migrations against DATABASE_URL
```

`apps/server` reads from `apps/server/.env` (see `.env.example`).
`apps/web` proxies `/api/*` and `/socket.io` to `localhost:8787` in dev.

## Stack (what the plans actually use)

The original spec said Express + plain PostgreSQL; the MVP plan upgrades the stack and this is what landed:

- HTTP: **Fastify 5** with `@fastify/cookie`, `@fastify/cors`, `fastify-type-provider-zod`.
- Realtime: **Socket.IO 4**, sharing the Fastify HTTP listener.
- Persistence: **Postgres** (via Drizzle ORM); one `matches` table for completed matches only.
- Hot store: **Redis** (Upstash-compatible) via `ioredis`. Authoritative during a match.
- Frontend state: **Zustand** with `persist` for session + UI preferences.
- Validation: **Zod**, shared from `packages/shared` so the same schema runs on both sides.
- Mobile UX: Tailwind + `vite-plugin-pwa` + safe-area utilities + wake lock + vibration.

The frontend reads `@bc/shared` via the workspace alias and the Vite resolver.

## Architecture invariants

These are non-negotiable; they shape almost every file.

**Server is authoritative.** The hot game state lives in Redis. Every mutating socket event re-validates payloads with Zod, then runs a transition inside `withRoomLock(code, ...)` against `loadRoom → mutate → saveRoom`.

**Secrets never leave the server while a match is live.** The only function allowed to build outbound room snapshots is `apps/server/src/rooms/view.ts::toRoomStateView(state, recipientToken)`. It filters `match.secrets[opponentToken]` until the stage is `ended` or `abandoned`.

**Pure game logic in `packages/shared/src/game`.** `scoreGuess`, `validateNumber`, `generateRoomCode`, `resolveRPS`, `digitPoolSize`, `isLengthFeasible`. No I/O, no `Date.now()`, no `Math.random()` inside (callers pass random sources where needed). Both server and client import these.

**Stable socket event names.** The names from `docs/requirements/00-overview.md` (`room_created`, `room_joined`, `player_ready`, `match_started`, `guess_submitted`, `result_calculated`, `turn_changed`, `match_ended`) are public contract. Added events use the same `lower_snake` style; client → server events use namespaced colons (`room:leave`, `guess:submit`).

**One room and one tab per session token.** Enforced via Redis keys (`bc:session:{token}:room`, `bc:session:{token}:tab`), not in-memory bookkeeping. The newest tab claims the slot and the previous tab gets `tab_demoted`.

## Layout cheat sheet

```
apps/server/src/
├── index.ts                  # Fastify + Socket.IO bootstrap
├── config.ts, logger.ts
├── routes/                   # session, rooms, health
├── sockets/                  # connection lifecycle, wrap.ts, handlers.ts
├── rooms/                    # room-state, store (redis), view, lock, timers, lifecycle
├── match/                    # engine.ts (FSM + scoring), persist.ts
├── auth/                     # session.ts (token + cookie), rate-limit.ts
└── db/                       # drizzle schema + client + migrate

apps/web/src/
├── main.tsx, App.tsx, styles.css
├── socket/                   # client, emit, subscriptions
├── stores/                   # session, connection, room, emote, ui (zustand)
├── hooks/                    # use-countdown, use-wake-lock, use-vibration, use-clipboard
├── pages/                    # Landing/Home/Create/Join/Room/NotFound
└── components/
    ├── auth/                 # RequireSession (nickname gate)
    ├── primitives/           # Button, Card, Modal, Countdown, SnackbarLayer, NicknameTag
    ├── layout/               # AppShell
    ├── inputs/               # DigitInput, RoomCodeInput, NicknameInput, SettingsForm
    ├── room/                 # EmptyLobby/Lobby/Secrets/RPS/Playing/Result/Abandoned + helpers
    ├── emote/                # EmotePanel, EmoteToastLayer
    └── presence/             # DisconnectBanner, ReclaimTabBanner

packages/shared/src/
├── index.ts                  # public re-exports
├── types/                    # stages, outcome, ids
├── schemas/                  # primitives, settings, number factory, rps, emote
├── events/                   # server-to-client, client-to-server (names + payload types)
├── game/                     # score, validate, codes, rps, rules
├── views.ts                  # RoomPublic / RoomStateView / GuessLogEntry / …
└── errors.ts                 # ErrorCode enum + AckResult union
```

## Implementation notes

- Put new game-rule logic in `packages/shared/src/game`. Do not duplicate the rule on the server.
- The match engine in `apps/server/src/match/engine.ts` is the only place that calls `endMatch`/`forfeitMatch`. Socket handlers call into it; they don't mutate `state.match` directly.
- Timers are an in-process map (`apps/server/src/rooms/timers.ts`) plus Redis-backed deadlines on the room state. After a restart, deadlines re-arm from Redis on the next read under the lock.
- Per-room concurrency is `async-lock` keyed by room code. If we ever go multi-instance, swap for `redlock` over Redis without changing call sites.
- The client never trusts a payload it didn't get from the server; pre-submit client-side validation exists only for UX (button gating, hint copy).

## Testing

There are no automated tests in MVP (per the plan). When adding tests later, start with `packages/shared/src/game` — the examples in `docs/plans/mvp/03-game-logic.md` are the correctness contract.
