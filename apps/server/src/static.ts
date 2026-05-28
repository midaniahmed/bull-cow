import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { logger } from './logger.js';

/**
 * Serve the built web app from the same origin as the API.
 *
 * The client connects to Socket.IO on the same origin and uses relative `/api`
 * paths, and session cookies are `sameSite: lax` — so the production deploy is
 * single-origin: this server hosts both the SPA and the realtime/API surface.
 *
 * Only API routes (`/api/*`) and Socket.IO (`/socket.io`) are reserved; every
 * other GET falls through to `index.html` so client-side routing works.
 */
export async function registerStatic(app: FastifyInstance) {
  // WEB_DIST wins (set in Docker); otherwise resolve apps/web/dist relative to
  // this compiled file at apps/server/dist/static.js.
  const here = dirname(fileURLToPath(import.meta.url));
  const root = process.env.WEB_DIST
    ? resolve(process.env.WEB_DIST)
    : resolve(here, '../../web/dist');

  if (!existsSync(join(root, 'index.html'))) {
    logger.warn({ root }, 'web build not found; serving API only');
    return;
  }

  await app.register(fastifyStatic, { root, wildcard: false });

  // SPA fallback: non-API GETs that miss a static file return the app shell.
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/socket.io')) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'not_found' });
  });

  logger.info({ root }, 'serving web build');
}
