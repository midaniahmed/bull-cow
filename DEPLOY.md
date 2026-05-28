# Deploying to play with friends (free)

This app is **single-origin**: the Fastify server serves the built web app *and*
the API/realtime on one port (8787). That keeps the same-origin cookie + socket
assumptions working. You only need to expose that one port.

Cost: $0. The only catch: your machine must stay on while you play.

## What runs where

- **Postgres + Redis** — local Docker containers (`bc-postgres`, `bc-redis`).
- **The app** — one Node process on `:8787` (web + API + Socket.IO).
- **Public URL** — a Cloudflare quick tunnel maps a public HTTPS URL to `:8787`.

## One-time / each session

1. **Make sure Postgres + Redis are up** (they already exist as `bc-postgres` /
   `bc-redis`):

   ```bash
   docker start bc-postgres bc-redis   # if not already running
   ```

2. **Stop the dev server if it's running** (`pnpm dev` also uses :8787).

3. **Build, migrate, and start the production server:**

   ```bash
   pnpm serve
   ```

   `serve` = `pnpm build` + `pnpm db:migrate` + start. After the first time you
   can just run `pnpm start` (skips rebuild/migrate). It listens on
   <http://localhost:8787> and logs `serving web build`.

4. **Open a public URL** in a second terminal and share it with friends:

   ```bash
   ~/.local/bin/cloudflared tunnel --url http://localhost:8787
   ```

   It prints a `https://<random>.trycloudflare.com` URL. That's the link to
   send. No account, no card; the URL lasts until you stop the tunnel.

When you're done, Ctrl-C the tunnel and the server. The DB/Redis containers can
keep running or be stopped with `docker stop bc-postgres bc-redis`.

## Config

Production env lives in `apps/server/.env.production`:

- `COOKIE_SECURE=false` — works over both the HTTPS tunnel and plain localhost.
- `WEB_DIST=../web/dist` — where the server finds the built web app (resolved
  from `apps/server`, the cwd when `pnpm start` runs).
- `DATABASE_URL` / `REDIS_URL` — point at the local Docker containers.

## Want a permanent URL instead?

A quick tunnel's URL changes every restart. For a stable URL, create a free
Cloudflare named tunnel bound to a domain you own:
<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/>.
The app side doesn't change — it still just points at `http://localhost:8787`.
