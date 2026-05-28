---
name: planning-features
description: Plan full-stack feature implementations for the Bulls & Cows PvP game by generating phase-specific planning documents across shared contracts, realtime/server, and the mobile-first React frontend. Explores the codebase for similar implementations and asks clarifying questions. Automatically use when user requests to "plan feature", "create feature plan", "plan implementation", "generate implementation plan", or provides a requirements document to plan.
---

# Planning Features

Plan full-stack feature implementations by generating structured, phase-specific planning documents. This skill walks through each layer of the stack — shared contracts, data and state, game logic, realtime events, HTTP endpoints, and the mobile-first frontend — explores the codebase for similar examples, and asks clarifying questions to ensure complete planning with no gaps between layers.

## When to Use This Skill

Use this skill when:

- User asks to "plan a feature" or "create a feature plan"
- User provides a requirements document and wants an implementation plan
- User says "plan implementation for X" or "what do I need to implement X"
- User wants to understand everything needed for a new feature, end to end
- User needs help breaking down a feature into implementation phases

## Assumed Technology Stack

This skill is opinionated about the stack so the plans are concrete. The phase structure stays the same even if individual choices shift.

**Repo layout — pnpm monorepo**

| Workspace | Purpose |
| --- | --- |
| `apps/server` | Node.js + Fastify + Socket.IO backend |
| `apps/web` | React 18 + Vite frontend (mobile-first) |
| `packages/shared` | Zod schemas, socket event types, pure game logic (scoring + rule validation) |

**Backend (`apps/server`)**

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | **Node.js + TypeScript** | |
| HTTP framework | **Fastify** | Used for non-socket endpoints: session bootstrap, room create, health |
| Realtime | **Socket.IO** + **Redis adapter** | Rooms, ack callbacks, reconnection, polling fallback |
| Hot state | **Redis (Upstash)** | Room state, session→room map, rate limits, nonce dedup, socket adapter pub/sub |
| Persistence | **PostgreSQL (Neon)** + **Drizzle ORM** | Completed match snapshots; minimal in MVP |
| Validation | **Zod** (shared with frontend) | Server still re-validates every payload — server is authoritative |

**Frontend (`apps/web`)**

| Concern | Choice |
| --- | --- |
| Framework | **React 18 + TypeScript + Vite** |
| Styling | **Tailwind CSS** |
| Client state | **Zustand** |
| Realtime client | **Socket.IO client** |
| Routing | **React Router** (`/`, `/room/:code`) |
| Schemas | **Zod** (imported from `packages/shared`) |
| Animation | **Framer Motion** |
| PWA | **`vite-plugin-pwa`** |
| QR | **`react-qr-code`** |

**Non-negotiables baked into every plan**

- **Server is authoritative.** Client validation is for UX only; the server re-validates every payload.
- **Secrets never leave the server** until the match reaches `ended` or `abandoned`.
- **Stable socket event names.** The events listed in `docs/requirements/00-overview.md` are the client/server contract. Don't rename them.
- **Mobile-first.** Every UI plan accounts for touch targets, numeric keypads, safe areas, and one-handed reach.
- **No tests in MVP.** Skip test phases entirely; don't propose them.

## What This Skill Does

### Overview

This skill creates a dedicated folder under `docs/plans/` containing a separate readme per implementation phase, ordered along the real dependency chain (contracts → data/state → game logic → realtime → HTTP → frontend):

```
docs/plans/
└── [feature-name]/
    ├── README.md                    # Overview and phase summary
    ├── 01-shared-contracts.md       # Zod schemas + socket event types in packages/shared
    ├── 02-data-model.md             # Drizzle (Postgres) schema + Redis key layout
    ├── 03-game-logic.md             # Pure scoring / rule validation in packages/shared
    ├── 04-server-state.md           # Room state machine, in-memory + Redis backing
    ├── 05-realtime-events.md        # Socket.IO handlers, broadcast scope, ack/nonce
    ├── 06-http-endpoints.md         # Fastify routes (session bootstrap, room create, etc.)
    ├── 07-auth-session.md           # Session token, multi-presence, rate limits
    ├── 08-frontend-state.md         # Zustand stores, selectors, socket→store wiring
    ├── 09-routes-pages.md           # React Router routes & page-level components
    ├── 10-components.md             # UI components (lobby, play screen, result, emote, etc.)
    ├── 11-hooks.md                  # Custom hooks (useSocket, useTurnTimer, useReconnect…)
    ├── 12-forms-inputs.md           # Inputs with mobile-friendly keyboards & Zod validation
    └── 13-mobile-ux.md              # Viewport, safe areas, tap targets, wake lock, vibration, PWA
```

Plan only the layers the feature actually touches. A purely client-side polish change skips 01–07. A backend-only protocol change skips 08–13. Phases that don't apply should not be created.

### Workflow

1. **Understand Requirements** — Read the requirements document(s) in `docs/requirements/`
2. **Determine Scope** — Identify which layers and phases apply
3. **Ask Clarifying Questions** — Resolve ambiguities one at a time
4. **Explore Codebase** — Find similar implementations across the workspaces
5. **Generate Phase Documents** — Create detailed plans per phase
6. **Create Overview** — Generate the summary `README.md`

## How to Use This Skill

### Step 1: Read Requirements & Explore Similar Features

Start from `docs/requirements/` — those files are the spine of any plan. Cross-check against `CLAUDE.md` for current repo state (early in the project, the scaffold may not yet exist; flag any phase that depends on files that haven't been created).

Then explore similar implementations across the workspaces. Adapt paths to the actual repo layout.

**Shared package — contracts and pure logic:**

```
Read: packages/shared/src/events/         # socket event type definitions
Read: packages/shared/src/schemas/        # Zod schemas
Read: packages/shared/src/game/           # pure scoring + rule validation
```

**Backend — server state & realtime:**

```
Read: apps/server/src/rooms/              # room state machine, lifecycle
Read: apps/server/src/match/              # match engine
Read: apps/server/src/sockets/            # socket handlers (per event)
Read: apps/server/src/redis/              # redis key helpers, adapters
Read: apps/server/src/db/schema.ts        # Drizzle schema
Read: apps/server/src/routes/             # Fastify HTTP routes
```

**Frontend — pages, state, components:**

```
Read: apps/web/src/pages/                 # route-level components
Read: apps/web/src/stores/                # Zustand stores
Read: apps/web/src/components/            # shared UI
Read: apps/web/src/hooks/                 # custom hooks
Read: apps/web/src/socket/                # socket client setup, event wiring
```

**Reference docs:**

- `docs/requirements/` — the requirements driving the plan
- `docs/plans/` — prior plans for similar features
- `CLAUDE.md` — repo conventions

### Step 2: Determine Feature Scope

Ask clarifying questions to understand which layers are in play. Ask **one at a time**.

**Required clarifications:**

- Does this feature add or change a socket event (or its payload)? If yes, `01-shared-contracts` and `05-realtime-events` apply.
- Does it need new Postgres tables/columns (Drizzle migration) or new Redis keys/TTLs? → `02-data-model`.
- Does it change scoring or rule validation (the pure game logic in `packages/shared`)? → `03-game-logic`.
- Does it change the room state machine, allowed transitions, or what's persisted in memory vs Redis? → `04-server-state`.
- Does it add an HTTP endpoint (not socket)? → `06-http-endpoints`.
- Does it touch session identity, multi-presence enforcement, or rate limits? → `07-auth-session`.
- Does it change client state shape or how the socket pushes updates into Zustand? → `08-frontend-state`.
- Does it add or change a route, page, component, hook, or input? → `09`–`12`.
- Does it have mobile-specific UX (numeric keypad, vibration, wake lock, PWA, safe-area)? → `13-mobile-ux` (almost always for UI work).

**Questions to ask when unclear:**

- What existing feature is most similar?
- Is this a new stage transition, or does it live inside an existing stage?
- Is any new state hot-path (Redis / in-memory) or cold-path (Postgres)?
- Are there realtime broadcast implications — who needs to receive what, and when?
- Is anti-cheat in play (server-only secrets, nonce dedup, turn ownership)?

### Step 3: Explore Similar Implementations

Before generating plans, study the closest existing feature to match established patterns.

**For a typical realtime feature, explore:**

- The relevant entries in `packages/shared/src/events/` and `packages/shared/src/schemas/`
- The closest existing socket handler in `apps/server/src/sockets/`
- The corresponding Zustand store and socket subscription wiring in `apps/web/src/stores/` and `apps/web/src/socket/`
- The page/component that renders the related stage

### Step 4: Generate Phase Documents

Create the feature plan folder and the phase documents that apply.

**Invoke implementation skills when present.** Some phases may have dedicated implementation skills as the project grows. If a matching skill exists, invoke it in plan mode to produce the phase. Otherwise, use the inline templates below.

| Phase | Implementation skill (if present) |
| --- | --- |
| 01-shared-contracts | `authoring-shared-contracts` |
| 02-data-model | `creating-drizzle-schema` |
| 03-game-logic | `writing-pure-game-logic` |
| 04-server-state | `designing-room-state` |
| 05-realtime-events | `authoring-socket-handlers` |
| 06-http-endpoints | `creating-fastify-routes` |
| 08-frontend-state | `creating-zustand-stores` |
| 10-components | `creating-components` |
| 11-hooks | `creating-hooks` |
| 12-forms-inputs | `creating-mobile-inputs` |

**Phase applicability guide:**

| Phase | When needed |
| --- | --- |
| 01-shared-contracts | New/changed socket events, payload schemas, or shared types |
| 02-data-model | New Postgres tables/columns or new Redis keys |
| 03-game-logic | Changes to scoring, rule validation, or other deterministic game functions |
| 04-server-state | New stage, transition, or state field; new in-memory or Redis-backed structure |
| 05-realtime-events | Any change to socket event semantics, payloads, broadcast scope, ack/nonce, or rate limit |
| 06-http-endpoints | New or modified HTTP route (non-socket) |
| 07-auth-session | Session token issuance, cookie behavior, multi-presence rules, rate limits |
| 08-frontend-state | New Zustand store / slice or new socket→store wiring |
| 09-routes-pages | New route or page-level component |
| 10-components | Any UI work (nearly every frontend feature) |
| 11-hooks | Custom data, timer, or behavior hooks |
| 12-forms-inputs | Number input, nickname input, room-code input, etc. |
| 13-mobile-ux | Numeric keypad, tap targets, safe areas, wake lock, vibration, PWA, install prompt — for any new UI |

### Step 5: Create Overview README

Generate `docs/plans/[feature-name]/README.md` with:

- Feature summary
- Requirements reference (link the file under `docs/requirements/`)
- Phase checklist with links
- Key decisions made (and any deviations from the assumed stack)
- Similar features referenced

## Phase Templates

### 01-shared-contracts.md

```markdown
# Phase 1: Shared Contracts (packages/shared)

## Socket events
### `[event_name]`
- **Direction**: client → server / server → client / bidirectional
- **Payload schema (Zod)**: `[EventName]Payload`
- **Ack payload (if any)**: shape returned to the sender
- **Broadcast scope**: sender / opponent / both / room
- **Stage(s) it is valid in**: lobby / secrets / rps / playing / ended
- **Stability**: new vs existing (existing event names are part of the public contract — don't rename)

## Zod schemas
- **`[SchemaName]`** — fields, refinements (e.g., length within 3–10, digit charset, leading-zero rule)
- **Where used**: socket event X, HTTP route Y, frontend form Z

## Shared types / enums
- [TypeName] — purpose, exhaustive variants

## Notes
- All schemas live in `packages/shared` and are imported by both `apps/server` and `apps/web`.
- Server re-validates every payload even though the client uses the same schemas.
```

### 02-data-model.md

```markdown
# Phase 2: Data Model

## Postgres (Drizzle) — `apps/server/src/db/schema.ts`
### `[table_name]`
- **New table / modified table**: [which]
- **Columns**: name : type (constraints, default)
- **Relations**: [relation, cardinality, on-delete]
- **Indexes / unique constraints**: [...]

## Migration
- **Name**: `[descriptive_migration_name]`
- **Backfill needed?**: [yes/no — describe]
- **Destructive?**: [columns/tables dropped, data implications]

## Redis keys
| Key pattern | Type | TTL | Purpose |
| --- | --- | --- | --- |
| `room:{code}` | hash | none (manual) | Authoritative room state during a match |
| `room:{code}:guesses` | list | with room | Ordered guess log |
| `session:{token}:room` | string | none | Multi-presence enforcement |
| `ratelimit:emote:{token}` | sorted set | 30s | Emote 5/30s rule |
| `nonce:{token}:{stage}` | set | turn/round scoped | Anti-replay dedup |

## Notes
- Hot path runs in memory + Redis. Postgres only stores completed matches and (later) accounts.
- TTLs and eviction interactions should match the grace windows in `03-presence-comms-edge.md`.
```

### 03-game-logic.md

```markdown
# Phase 3: Game Logic (pure, packages/shared/src/game)

## Function(s)
### `[functionName](args): result`
- **Purpose**: [what it computes]
- **Inputs / outputs**: exact shapes
- **Determinism**: pure, no I/O — safe to import on both client and server
- **Rules covered**: length, duplicates, leading zero, bulls/cows scoring, etc.

## Edge cases to cover in the logic
- [e.g., guess length mismatch — must throw or return a typed error]
- [e.g., scoring with allow_duplicate_digits=true]

## Notes
- Client uses these for input feedback. Server uses the same functions inside event handlers — single source of truth.
```

### 04-server-state.md

```markdown
# Phase 4: Server State

## Room state shape
- **In-memory authoritative struct**: [fields]
- **Mirrored to Redis** under [keys] for: cross-instance fan-out, reconnection restore, crash recovery
- **What never leaves the server**: secrets, opponent's secret in any payload pre-`ended`

## Stage transitions affected
- From `[stage]` → `[stage]` triggered by `[event/condition]`
- Side effects: timers started/stopped, Redis keys written, broadcasts emitted

## Timers
| Timer | Duration | Owner | Pause/resume rule |
| --- | --- | --- | --- |
| Turn timer | per room setting | active player | pauses on disconnect |
| Secret submission | 60s | each player | pauses on disconnect |
| Disconnect grace | per stage (see 03 requirements) | disconnected player | hard expiry |

## Concurrency
- [Single-instance lock per room; Redis key for cross-instance ownership if scaled out]
```

### 05-realtime-events.md

```markdown
# Phase 5: Realtime Events (Socket.IO)

## Inbound handler: `[event_name]`
- **File**: `apps/server/src/sockets/[handler].ts`
- **Payload schema**: `[Name]Payload` (from `packages/shared`)
- **Server re-validation**: every field — never trust the client
- **Authorization**: session token → room membership → turn ownership (where applicable)
- **Nonce / dedup**: [yes/no, how scoped]
- **State changes**: [which fields, in memory + Redis]
- **Broadcast**: which event(s) emitted, to whom (sender / opponent / room)
- **Ack**: payload returned to the sender

## Outbound emit: `[event_name]`
- **Trigger**: [what causes it]
- **Recipients**: [scope]
- **Payload**: schema reference

## Rate limit
- [Per-event limit if any; global 100 msgs/min still applies]

## Anti-cheat checklist
- [ ] Secrets not in any payload sent to the opponent before `ended`
- [ ] Turn ownership enforced
- [ ] Nonce dedup applied to mutation events
- [ ] Server re-validates against shared Zod schema
```

### 06-http-endpoints.md

```markdown
# Phase 6: HTTP Endpoints (Fastify)

## [METHOD] /[path]
- **Handler file**: `apps/server/src/routes/[route].ts`
- **Request schema (Zod)**: `[Name]RequestSchema`
- **Response schema (Zod)**: `[Name]ResponseSchema`
- **Auth**: session token cookie / none / specific
- **Status codes**: 200 / 201 / 400 / 403 / 404 / 409 / 429
- **Side effects**: [Redis writes, Postgres writes, socket emits]
- **Idempotency**: [if applicable]

## Notes
- HTTP is for session bootstrap, room creation, code resolution, health. The match itself runs entirely over sockets.
```

### 07-auth-session.md

```markdown
# Phase 7: Auth & Session

## Session token
- **Issuance**: server-side on first contact; opaque, long-lived
- **Storage**: `HttpOnly` cookie (authoritative for socket handshake) + `localStorage` (cross-tab continuity)
- **Rotation**: never in MVP

## Multi-presence rules
- **One room at a time**: [Redis key `session:{token}:room`] — joining a second room prompts "leave current"
- **One active tab per room**: [most-recent tab claims; older demoted to read-only]

## Rate limits
| Limit | Scope | Backing |
| --- | --- | --- |
| 5 emotes / 30s | per session | Redis sorted set |
| 20 simultaneous-round resubmits | per round per session | in-memory counter |
| 100 socket msgs / min | per session, all events | Redis token bucket |
```

### 08-frontend-state.md

```markdown
# Phase 8: Frontend State (Zustand)

## Store: `use[Feature]Store`
- **File**: `apps/web/src/stores/[feature].store.ts`
- **State shape**: [fields]
- **Actions**: [setters / handlers]
- **Selectors**: [memoized derived data]
- **Socket wiring**: which incoming events update which fields (`apps/web/src/socket/subscriptions.ts`)
- **Persistence**: localStorage / sessionStorage / none

## Why Zustand (not React Context)
- Socket-driven updates would re-render the entire tree under Context; Zustand's selector subscription model avoids that.
```

### 09-routes-pages.md

```markdown
# Phase 9: Routes & Pages

## Route: `/[path]`
- **Page component**: `apps/web/src/pages/[Page].tsx`
- **Params**: [from URL]
- **Required state**: [stores it reads]
- **Stage gate**: which room stage(s) this page is valid in; redirects otherwise

## Navigation
- **How users reach it**: [link, redirect, programmatic push]
```

### 10-components.md

```markdown
# Phase 10: Components

## `[ComponentName]`
- **File**: `apps/web/src/components/[component]/[Component].tsx`
- **Purpose**: [what it renders]
- **Props**: [shape]
- **State sources**: [Zustand selectors, local state]
- **Animations**: [Framer Motion targets, if any]
- **Mobile considerations**: tap target sizes, layout under safe-area insets, one-handed reach

## Layout
- [Mobile-first: stack on narrow viewport, side-by-side at md+]
- [Primary actions in the lower half of the viewport]
```

### 11-hooks.md

```markdown
# Phase 11: Custom Hooks

## `use[HookName]`
- **File**: `apps/web/src/hooks/use-[hook].ts`
- **Purpose**: [what it manages — timers, socket subscriptions, wake lock, vibration, reconnection, etc.]
- **Dependencies**: stores, socket client, browser APIs
- **Returns**: shape

## Common patterns
- Wrap browser APIs (Wake Lock, Vibration, Page Visibility) in hooks with graceful fallback when the API is unavailable.
- Subscribe to a single Zustand selector to minimize re-renders.
```

### 12-forms-inputs.md

```markdown
# Phase 12: Forms & Inputs

## Input: `[name]`
- **File**: `apps/web/src/components/inputs/[Input].tsx`
- **Validation**: Zod schema from `packages/shared`
- **Mobile keyboard**: `inputMode="numeric"` + `pattern="[0-9]*"` for digit inputs; `autoCapitalize="characters"` for room codes
- **Affordances**: per-digit grey-out when duplicates disabled, live readout of active rules, 44px+ tap target
- **Error display**: inline, non-blocking, doesn't shift layout

## Submission
- Client-side validation gates the submit button; server still re-validates.
```

### 13-mobile-ux.md

```markdown
# Phase 13: Mobile UX

## Viewport & layout
- `100dvh` (not `100vh`) for full-height containers — accounts for the iOS Safari URL bar
- `viewport-fit=cover` + `env(safe-area-inset-*)` padding on top/bottom bars
- Primary CTAs in the lower half (one-handed reach)
- Minimum 44px tap targets; `touch-action: manipulation` on buttons

## Input
- `inputMode="numeric"` on digit/code inputs to trigger the numeric keypad
- Avoid `autoFocus` on inputs that would force the keyboard up before the user has read the screen

## Sensory feedback
- **Wake Lock API** during your own active turn — release on stage exit or visibility loss
- **Vibration API** on turn-start and incoming emotes — user-toggleable, off by default in lobby
- Both wrapped in hooks with feature detection (Safari iOS lacks Vibration)

## PWA
- `vite-plugin-pwa` manifest: name, short_name, theme color matching the in-game palette, icons (192/512), `display: standalone`
- Service worker: precache the app shell only — do not attempt offline gameplay (server-authoritative)
- Install prompt: surface after the first completed match, not on landing

## Network resilience
- Reconnection banner during socket retry; matches the 60s grace
- Optimistic UI is fine for emotes and Ready toggles, but never for guesses (server-authoritative)
```

## Clarifying Questions Guide

### Contract questions

```
Question: "Is this feature a new socket event, an existing event with a new payload, or no socket change?"
Options:
- New event (add to packages/shared events + new handler)
- Existing event, new/changed payload (update shared schema, version carefully)
- No socket change (HTTP or pure client work)
```

### Data questions

```
Question: "What does this feature read or write?"
Options:
- New Postgres table/column (Drizzle migration)
- New Redis key (hot state)
- Existing structures only
- Read-only / derived
```

### State questions

```
Question: "Does this introduce a new stage, a new transition, or new fields on the room state?"
Options:
- New stage (update state machine + reconnection restore)
- New transition between existing stages
- New field on existing stage only
- No state machine change
```

### Permission questions

```
Question: "Who is allowed to invoke this action?"
Options:
- Anyone with a session token
- Only the room's creator
- Only the active turn player
- Both players in the room (e.g., emotes)
- Specific stage(s) only
```

### UI questions

```
Question: "How should this feature's UI be organized?"
Options:
- New page / route
- New section in an existing page
- Modal / drawer / overlay on existing page
- Inline change to an existing component
```

### Mobile questions

```
Question: "Are there mobile-specific behaviors?"
Options:
- Numeric keypad input
- Wake lock during active turn
- Vibration on event
- Safe-area / orientation handling
- PWA install affordance
- None unique to mobile
```

## Important Guidelines

**DO:**

- **Always explore similar features first** across shared, server, and web workspaces
- Plan along the dependency chain: contracts → data/state → game logic → realtime → HTTP → frontend
- Keep the Zod schemas in `packages/shared` as the single source of truth for both sides
- **Invoke implementation skills** when available; fall back to the inline templates otherwise
- Read `docs/requirements/` thoroughly — it is the spine of the plan
- Ask clarifying questions, one at a time, when requirements are ambiguous
- Include specific file paths, event names, schema names, and Redis keys in phase documents
- Follow existing patterns in the codebase
- Plan for reconnection, validation rejection, rate-limit rejection, and abandoned-match outcomes
- Treat mobile UX as part of every UI plan — not an afterthought

**DON'T:**

- Generate phase documents for layers the feature doesn't touch
- Skip clarifying questions for ambiguous requirements
- Let shared schemas and runtime validation drift apart between client and server
- Plan a test phase — tests are out of scope in MVP
- Prescribe low-level implementation beyond what the templates ask for
- Propose sending a player's own secret to the opponent under any condition before `ended`
- Rename or restructure the canonical socket events (`room_created`, `room_joined`, `player_ready`, `match_started`, `guess_submitted`, `result_calculated`, `turn_changed`, `match_ended`, etc.) — they are the public contract
- Plan a destructive migration without flagging the data implications
- Add features the requirements don't ask for

## Notes

**Stack assumptions** are listed in the tables above; record any deviation in the plan's `README.md`.

**Files to explore:**

- `docs/requirements/*.md` — the requirements driving the plan
- `docs/plans/*/` — prior plans for similar features
- `packages/shared/src/` — event types, Zod schemas, pure game logic
- `apps/server/src/` — Fastify routes, socket handlers, room/match engine, Drizzle schema, Redis helpers
- `apps/web/src/` — pages, stores, components, hooks, socket subscriptions
- `CLAUDE.md` — repo conventions and current scaffold status

**Early-project caveat:** until the scaffold lands, many of the paths above won't exist yet. In that case, plan against the intended structure and flag in the README that the phase depends on scaffolding that hasn't shipped.
