import type { FastifyInstance } from 'fastify';
import { RoomSettingsSchema, RoomCodeSchema, isLengthFeasible } from '@bc/shared';
import { z } from 'zod';
import { SESSION_COOKIE_NAME, readSession, getSessionRoom, setSessionRoom, clearSessionRoom } from '../auth/session.js';
import { allocateUniqueRoomCode } from '../rooms/lifecycle.js';
import { withRoomLock } from '../rooms/lock.js';
import { loadRoom, saveRoom, deleteRoom, freeCode } from '../rooms/store.js';
import { makeInitialPlayer, type RoomState } from '../rooms/room-state.js';
import { TTL_SECONDS } from '../redis/client.js';
import { toRoomPublic } from '../rooms/view.js';
import { closeRoom, forfeitMatch } from '../match/engine.js';
import { scheduleTimer } from '../rooms/timers.js';

const CREATOR_AFK_MS = 5 * 60_000;

export async function roomRoutes(app: FastifyInstance) {
  app.post('/api/rooms', {
    schema: { body: RoomSettingsSchema },
    handler: async (req, reply) => {
      const token = req.cookies[SESSION_COOKIE_NAME];
      if (!token) {
        return reply.code(401).send({ ok: false, code: 'session_invalid', message: 'no session' });
      }
      const session = await readSession(token);
      if (!session) {
        return reply.code(401).send({ ok: false, code: 'session_invalid', message: 'invalid session' });
      }

      const settings = req.body as z.infer<typeof RoomSettingsSchema>;
      if (!isLengthFeasible(settings.number)) {
        return reply.code(400).send({
          ok: false,
          code: 'settings_invalid',
          message: 'length not feasible',
          field: 'length',
        });
      }

      const existing = await getSessionRoom(token);
      if (existing) {
        return reply
          .code(409)
          .send({ ok: false, code: 'room_other_active', message: 'already in a room', existingRoom: existing });
      }

      const code = await allocateUniqueRoomCode();
      const now = Date.now();
      const state: RoomState = {
        code,
        stage: 'waiting',
        settings,
        creator: makeInitialPlayer(token, session.nickname, null),
        joiner: null,
        match: null,
        rematchHistory: [],
        createdAt: now,
      };
      await saveRoom(state);
      await setSessionRoom(token, code, TTL_SECONDS.roomWaiting);
      scheduleTimer(code, 'creator_afk', null, now + CREATOR_AFK_MS);

      return reply.code(201).send({
        room: toRoomPublic(state),
        joinUrl: `/room/${code}`,
      });
    },
  });

  app.get('/api/rooms/:code', {
    schema: {
      params: z.object({ code: RoomCodeSchema }),
    },
    handler: async (req, reply) => {
      const token = req.cookies[SESSION_COOKIE_NAME];
      if (!token) {
        return reply.code(401).send({ ok: false, code: 'session_invalid', message: 'no session' });
      }
      const { code } = req.params as { code: string };
      const state = await loadRoom(code);
      if (!state) {
        return reply.code(404).send({ ok: false, code: 'room_not_found', message: 'room not found' });
      }
      if (state.stage === 'ended' || state.stage === 'abandoned') {
        return reply.code(410).send({ ok: false, code: 'room_ended', message: 'room ended' });
      }
      if (state.stage !== 'waiting' && state.stage !== 'lobby') {
        return reply.code(409).send({ ok: false, code: 'room_in_progress', message: 'in progress' });
      }
      if (state.creator.sessionToken === token) {
        return reply.code(409).send({ ok: false, code: 'room_already_member', message: 'you are creator' });
      }
      if (state.joiner && state.joiner.sessionToken !== token) {
        return reply.code(409).send({ ok: false, code: 'room_full', message: 'room is full' });
      }
      return reply.send({
        room: {
          code: state.code,
          settings: state.settings,
          creator: {
            sessionToken: state.creator.sessionToken,
            nickname: state.creator.nickname,
            connected: state.creator.connected,
            ready: state.creator.ready,
            strikes: state.creator.strikes,
          },
          createdAt: new Date(state.createdAt).toISOString(),
        },
      });
    },
  });

  app.delete('/api/rooms/:code/membership', {
    schema: { params: z.object({ code: RoomCodeSchema }) },
    handler: async (req, reply) => {
      const token = req.cookies[SESSION_COOKIE_NAME];
      if (!token) {
        return reply.code(401).send({ ok: false, code: 'session_invalid', message: 'no session' });
      }
      const { code } = req.params as { code: string };
      const result = await withRoomLock(code, async () => {
        const state = await loadRoom(code);
        if (!state) return { ok: true as const };
        if (state.stage === 'waiting' && state.creator.sessionToken === token) {
          await closeRoom(state, 'creator_left_waiting');
          await clearSessionRoom(token);
          return { ok: true as const };
        }
        if (state.stage === 'lobby') {
          if (state.creator.sessionToken === token) {
            const joinerToken = state.joiner?.sessionToken;
            await closeRoom(state, 'creator_left_lobby');
            await clearSessionRoom(token);
            if (joinerToken) await clearSessionRoom(joinerToken);
            return { ok: true as const };
          }
          if (state.joiner && state.joiner.sessionToken === token) {
            state.joiner = null;
            state.stage = 'waiting';
            state.creator.ready = false;
            await saveRoom(state);
            await clearSessionRoom(token);
            return { ok: true as const };
          }
        }
        if (state.stage === 'secrets' || state.stage === 'rps' || state.stage === 'playing') {
          await forfeitMatch(state, token, 'voluntary');
          await clearSessionRoom(token);
          return { ok: true as const };
        }
        return { ok: true as const };
      });
      return reply.send(result);
    },
  });
}
