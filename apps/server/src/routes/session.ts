import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NicknameSchema } from '@bc/shared';
import {
  SESSION_COOKIE_NAME,
  generateSessionToken,
  readSession,
  writeSession,
} from '../auth/session.js';
import { config } from '../config.js';
import { withRoomLock } from '../rooms/lock.js';
import { loadRoom, saveRoom } from '../rooms/store.js';
import { getSessionRoom } from '../auth/session.js';
import { broadcastToRoom, emitToToken } from '../rooms/broadcast.js';
import { toRoomStateView } from '../rooms/view.js';
import { bothPlayers } from '../rooms/room-state.js';

const cookieOpts = () => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
});

export async function sessionRoutes(app: FastifyInstance) {
  app.post('/api/session', {
    schema: { body: z.object({ nickname: NicknameSchema }) },
    handler: async (req, reply) => {
      const body = req.body as { nickname: string };
      const cookieToken = req.cookies[SESSION_COOKIE_NAME] ?? null;
      const existing = cookieToken ? await readSession(cookieToken) : null;
      let token: string;
      let isNew: boolean;
      if (existing && cookieToken) {
        token = cookieToken;
        isNew = false;
      } else {
        token = generateSessionToken();
        isNew = true;
      }
      const record = await writeSession(token, body.nickname, isNew);
      reply.setCookie(SESSION_COOKIE_NAME, token, cookieOpts());
      return reply.send({ sessionToken: token, nickname: record.nickname });
    },
  });

  app.patch('/api/session', {
    schema: { body: z.object({ nickname: NicknameSchema }) },
    handler: async (req, reply) => {
      const token = req.cookies[SESSION_COOKIE_NAME];
      if (!token) {
        return reply.code(401).send({ ok: false, code: 'session_invalid', message: 'no session' });
      }
      const existing = await readSession(token);
      if (!existing) {
        return reply.code(401).send({ ok: false, code: 'session_invalid', message: 'invalid session' });
      }
      const body = req.body as { nickname: string };
      const record = await writeSession(token, body.nickname, false);
      reply.setCookie(SESSION_COOKIE_NAME, token, cookieOpts());

      // If the user is in a room in waiting/lobby, update the snapshot too.
      const roomCode = await getSessionRoom(token);
      if (roomCode) {
        await withRoomLock(roomCode, async () => {
          const state = await loadRoom(roomCode);
          if (!state) return;
          if (state.stage === 'waiting' || state.stage === 'lobby') {
            if (state.creator.sessionToken === token) {
              state.creator.nickname = record.nickname;
            } else if (state.joiner?.sessionToken === token) {
              state.joiner.nickname = record.nickname;
            }
            await saveRoom(state);
            for (const p of bothPlayers(state)) {
              emitToToken(state.code, p.sessionToken, 'room_state', toRoomStateView(state, p.sessionToken));
            }
          }
        });
      }

      return reply.send({ sessionToken: token, nickname: record.nickname });
    },
  });
}
