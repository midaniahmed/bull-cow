# MVP Implementation Plan — Bulls & Cows PvP

A single end-to-end plan for the MVP. Phases are ordered along the dependency chain so each phase can be built on top of the ones above it.

## Source requirements

- `docs/requirements/00-overview.md` — scope, entities, stages, event names, consolidated acceptance criteria
- `docs/requirements/01-rooms-and-lobby.md` — entry flow, room creation, joining, lobby, room expiry
- `docs/requirements/02-match-flow.md` — secret submission, first-turn selection, alternating + simultaneous play, end-of-match, rematch
- `docs/requirements/03-presence-comms-edge.md` — reconnection, multi-presence, emotes, anti-cheat, edge cases

## Phases

| # | Phase | What it covers |
| --- | --- | --- |
| 01 | [Shared contracts](./01-shared-contracts.md) | Zod schemas, socket event names + payloads, shared types in `packages/shared` |
| 02 | [Data model](./02-data-model.md) | Drizzle/Postgres `matches` table; full Redis key layout + TTLs |
| 03 | [Game logic](./03-game-logic.md) | Pure scoring, rule validation, code generation, RPS resolver in `packages/shared/game` |
| 04 | [Server state](./04-server-state.md) | Room FSM, transitions, timers, per-recipient view serializer |
| 05 | [Realtime events](./05-realtime-events.md) | Every Socket.IO handler — inbound, outbound, broadcast scope |
| 06 | [HTTP endpoints](./06-http-endpoints.md) | Fastify routes: `POST /session`, `POST /rooms`, `GET /rooms/:code`, … |
| 07 | [Auth & session](./07-auth-session.md) | Session token issuance, multi-presence rules, rate limits, nonce dedup |
| 08 | [Frontend state](./08-frontend-state.md) | Zustand stores + the socket → store wiring layer |
| 09 | [Routes & pages](./09-routes-pages.md) | React Router routes; polymorphic `RoomPage` that renders per stage |
| 10 | [Components](./10-components.md) | UI component inventory grouped by area |
| 11 | [Hooks](./11-hooks.md) | Timer, browser-API, lifecycle, and selector hooks |
| 12 | [Forms & inputs](./12-forms-inputs.md) | Nickname, room code, digit input, RPS picker, settings form |
| 13 | [Mobile UX](./13-mobile-ux.md) | Viewport, safe areas, wake lock, vibration, PWA, install prompt |

## Recommended implementation order

The phases are written as **layered**, but you don't need to finish each phase before starting the next. A natural slice-then-deepen order:

1. **Skeleton**: monorepo scaffold + the `packages/shared` exports (phases 01 + 03).
2. **Server up**: data layer + room state machine + `POST /session` + `POST /rooms` (phases 02 + 04 + 06 + 07 — at least the create/join paths).
3. **First socket round-trip**: client connects, sees `room_created`, sends Ready, sees the other player ready (phases 05 + 08 + 09 + 10).
4. **First match end-to-end**: secret submission, alternating turns, win detection (phases 03's `scoreGuess`, plus the rest of 05).
5. **Polish loops**: simultaneous mode, RPS, fog, emotes, rematch (the remainder of 05 + 10).
6. **Resilience**: reconnection, multi-tab, rate limits (rest of 07 + 11).
7. **Mobile finish**: inputs, vibration, wake lock, PWA install (12 + 13).

This is a recommendation, not a constraint — the plan documents are independent enough that any reasonable order works.

## Key decisions

- **Server is authoritative.** Every payload is re-validated on the server using the same Zod schemas as the client. Secrets never appear in any payload sent to the opponent while the match is live (`stage ∈ {lobby, secrets, rps, playing}`); a single serializer `toRoomStateView(state, recipient)` is the only place the filter is enforced (phase 04).
- **Redis is the authoritative hot store**, not just a cache. The in-process timer wheel can be rebuilt from Redis at any moment, which makes single-instance restarts safe. (phase 02, 04)
- **Postgres is minimal in MVP** — a single `matches` table written once at match end. No `rooms`, no `players`. (phase 02)
- **Stable socket event names.** Names listed in `docs/requirements/00-overview.md` are part of the public contract and don't change. New events introduced in this requirements set match the existing naming style (`lower_snake`). (phase 01)
- **Pure game logic** lives in `packages/shared/src/game` and is imported by both server and client — no duplication. (phase 03)
- **Mobile-first** for the whole UI. No screen designed for desktop and then squeezed to mobile. Numeric keypad, safe areas, wake lock, vibration are baked into the relevant components from day one. (phase 13)
- **One room at a time per session token**, **one active tab at a time per room** — enforced via Redis keys, not memory. (phase 07)
- **No tests in MVP.** Per the planning-features skill. Phase docs note correctness contracts (e.g., score function examples), but no test files are planned.

## Stack deviations from `CLAUDE.md`

`CLAUDE.md` (and the original spec) names the stack as **React + TypeScript + Vite (frontend), Node.js + Express + Socket.IO (backend), PostgreSQL**. The planning-features skill's assumed stack is more specific and slightly different:

| Choice | `CLAUDE.md` | This plan | Reason for the deviation |
| --- | --- | --- | --- |
| HTTP framework | Express | **Fastify** | First-class TypeScript + Zod integration via `@fastify/type-provider-zod`. Shares the HTTP listener with Socket.IO the same way Express does. Same shape, better ergonomics. |
| Realtime adapter | (not specified) | **Socket.IO Redis adapter** | Needed for cross-instance broadcast when we eventually scale horizontally; no cost in single-instance mode. |
| Persistence ORM | (not specified) | **Drizzle ORM (Postgres)** | Type-safe SQL with the same schema imported in TS, no migration of conventions later. |
| Hot store | (not specified) | **Upstash Redis** | Hot match state, rate limits, presence enforcement. |
| Frontend state | (not specified) | **Zustand** | Selector subscriptions avoid the re-render-everything pattern Context would cause under socket-driven updates. |
| Validation | (not specified) | **Zod**, shared `packages/shared` | One schema definition serves both runtime validation and TypeScript types on both sides. |
| Frontend animation | (not specified) | **Framer Motion** | For the few targeted reveals (RPS result, emote toasts, winner banner). |
| PWA | (not specified) | **`vite-plugin-pwa`** | Manifest + minimal SW for the app shell. |

These deviations should be reconciled in `CLAUDE.md` once the scaffold lands — the file's own instructions say to update it when the first code arrives.

## Repo state caveat

At the time of writing, the repository contains only `bulls_and_cows_pvp_spec.md` and the `docs/` tree. **None of the workspaces, packages, or build configuration exist yet.** Every phase here is planning against the intended structure; the very first implementation work will be:

- Initialize the pnpm monorepo (`pnpm-workspace.yaml`, root `package.json`)
- Scaffold `apps/server`, `apps/web`, `packages/shared`
- Wire base tooling: TypeScript, ESLint, Prettier, Vite, Tailwind, Drizzle, Fastify, Socket.IO

That scaffold work is **not** broken out as its own phase document because it's mechanical and well-trodden — but it's a prerequisite for everything below phase 01.

## Acceptance criteria for the plan as a whole

The MVP is complete when the consolidated acceptance list in `docs/requirements/00-overview.md` § "Consolidated Acceptance Criteria" passes, plus the per-phase acceptance lists at the end of each phase document.

## Similar features referenced

None — this is the first plan in the repo. Future plans should reference back to these phase documents when adding incremental features (e.g., "accounts" later will extend phase 07, "ranked mode" will extend phases 01/04/05/08/10).
