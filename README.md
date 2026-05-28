# Bulls & Cows — Online PvP

A mobile-first, real-time PvP version of the classic Bulls & Cows number-guessing game. Two players, one room, server-authoritative scoring.

See `bulls_and_cows_pvp_spec.md` for the product spec and `docs/plans/mvp/` for the layered implementation plan.

## Stack

- **Frontend**: React 18 + Vite + Tailwind + Zustand + Socket.IO client, mobile-first PWA.
- **Backend**: Fastify 5 + Socket.IO 4 sharing one HTTP listener.
- **Persistence**: Drizzle ORM + PostgreSQL — one `matches` table for completed matches.
- **Hot store**: Redis (Upstash-compatible) — authoritative during a match.
- **Shared**: Zod schemas, pure game logic, event-name constants in `packages/shared`.

## Quickstart

Requires Node ≥ 20 and pnpm (Corepack handles install). You'll need a Postgres database and a Redis instance — local Docker works fine.

```bash
pnpm install

# 1. Copy server env example and point it at your local services
cp apps/server/.env.example apps/server/.env
# edit .env: DATABASE_URL, REDIS_URL

# 2. Initialise the database schema
pnpm db:generate
pnpm db:migrate

# 3. Run the dev stack
pnpm dev          # server on :8787, web on :5173 (with proxy)
# or
pnpm dev:server
pnpm dev:web
```

Open `http://localhost:5173`.

## Layout

```
apps/
  server/   Fastify + Socket.IO backend
  web/      React + Vite frontend
packages/
  shared/   Zod schemas, types, game logic, event names
docs/
  requirements/
  plans/mvp/
```

`CLAUDE.md` has the architecture invariants and pointers into the codebase for both humans and agent collaborators.
