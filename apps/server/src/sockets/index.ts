import { Server as IOServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
import crypto from 'node:crypto';
import { logger } from '../logger.js';
import { SESSION_COOKIE_NAME, readSession, getSessionRoom, setSessionRoom, setSessionTab, getSessionTab, clearSessionRoom } from '../auth/session.js';
import { setIO, broadcastToRoom, emitToToken } from '../rooms/broadcast.js';
import { withRoomLock } from '../rooms/lock.js';
import { loadRoom, saveRoom } from '../rooms/store.js';
import { TTL_SECONDS } from '../redis/client.js';
import { bothPlayers, makeInitialPlayer, opponentTokenOf, playerByToken } from '../rooms/room-state.js';
import { toRoomStateView } from '../rooms/view.js';
import { scheduleTimer, clearTimer } from '../rooms/timers.js';
import { registerSocketHandlers } from './handlers.js';

const DISCONNECT_GRACE_MS = 60_000;

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';').map((s) => s.trim());
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    const k = p.slice(0, eq);
    if (k === name) return decodeURIComponent(p.slice(eq + 1));
  }
  return null;
}

export function attachSocketServer(httpServer: HTTPServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
  });
  setIO(io);

  io.on('connection', async (socket) => {
    try {
      const cookieHeader = socket.request.headers.cookie;
      const token = parseCookie(cookieHeader, SESSION_COOKIE_NAME) ??
        ((socket.handshake.auth as { token?: string })?.token ?? null);
      if (!token) {
        socket.emit('room_closed', { reason: 'idle_post_match' as const });
        socket.disconnect(true);
        return;
      }
      const session = await readSession(token);
      if (!session) {
        socket.disconnect(true);
        return;
      }
      const requestedRoom =
        (socket.handshake.query?.room as string | undefined) ?? null;

      socket.data.sessionToken = token;
      socket.data.tabId = crypto.randomBytes(8).toString('hex');

      if (!requestedRoom) {
        return;
      }

      // Join the room — handle commit-to-join for an empty joiner slot.
      await withRoomLock(requestedRoom, async () => {
        const state = await loadRoom(requestedRoom);
        if (!state) {
          socket.emit('room_closed', { reason: 'abandoned' as const });
          socket.disconnect(true);
          return;
        }

        const isCreator = state.creator.sessionToken === token;
        const isJoiner = state.joiner?.sessionToken === token;
        let committed = false;

        // First-time joiner commit
        if (!isCreator && !isJoiner && state.stage === 'waiting' && !state.joiner) {
          // Check session not in another room
          const existingRoom = await getSessionRoom(token);
          if (existingRoom && existingRoom !== requestedRoom) {
            socket.emit('room_closed', { reason: 'abandoned' as const });
            socket.disconnect(true);
            return;
          }
          state.joiner = makeInitialPlayer(token, session.nickname, socket.data.tabId);
          state.stage = 'lobby';
          await setSessionRoom(token, state.code, TTL_SECONDS.roomActive);
          committed = true;
          // Clear creator AFK timer
          clearTimer(state.code, 'creator_afk', null);
        }

        if (!isCreator && !isJoiner && !committed) {
          // Not a member: reject
          socket.emit('room_closed', { reason: 'abandoned' as const });
          socket.disconnect(true);
          return;
        }

        // Tab claim / demote others
        socket.data.roomCode = state.code;
        socket.join(`room:${state.code}`);
        const prevTab = await getSessionTab(token);
        if (prevTab && prevTab !== socket.data.tabId) {
          // Demote any prior socket of this token in the room
          const sids = (io.sockets.adapter.rooms.get(`room:${state.code}`) ?? new Set<string>()) as Set<string>;
          for (const sid of sids) {
            if (sid === socket.id) continue;
            const other = io.sockets.sockets.get(sid);
            if (other && (other.data as { sessionToken?: string }).sessionToken === token) {
              other.emit('tab_demoted', { reason: 'newer_tab_connected' });
            }
          }
        }
        await setSessionTab(token, socket.data.tabId);

        // Reconnect: clear disconnect-grace timer
        const player = playerByToken(state, token);
        if (player) {
          const wasDisconnected = !player.connected;
          player.connected = true;
          player.disconnectGraceEndsAt = null;
          player.activeTabId = socket.data.tabId;
          clearTimer(state.code, 'disconnect_grace', token);
          if (wasDisconnected) {
            broadcastToRoom(state.code, 'player_reconnected', { playerToken: token });
          }
        }

        // Notify and broadcast state
        if (committed) {
          broadcastToRoom(state.code, 'room_joined', {
            room: {
              code: state.code,
              stage: state.stage,
              settings: state.settings,
              players: {
                creator: {
                  sessionToken: state.creator.sessionToken,
                  nickname: state.creator.nickname,
                  connected: state.creator.connected,
                  ready: state.creator.ready,
                  strikes: state.creator.strikes,
                },
                joiner: state.joiner
                  ? {
                      sessionToken: state.joiner.sessionToken,
                      nickname: state.joiner.nickname,
                      connected: state.joiner.connected,
                      ready: state.joiner.ready,
                      strikes: state.joiner.strikes,
                    }
                  : null,
              },
              createdAt: new Date(state.createdAt).toISOString(),
            },
            joiner: state.joiner
              ? {
                  sessionToken: state.joiner.sessionToken,
                  nickname: state.joiner.nickname,
                  connected: state.joiner.connected,
                  ready: state.joiner.ready,
                  strikes: state.joiner.strikes,
                }
              : ({} as never),
          });
        }
        if (isCreator && state.stage === 'waiting') {
          // creator connection — emit room_created shell
          socket.emit('room_created', {
            room: {
              code: state.code,
              stage: state.stage,
              settings: state.settings,
              players: {
                creator: {
                  sessionToken: state.creator.sessionToken,
                  nickname: state.creator.nickname,
                  connected: state.creator.connected,
                  ready: state.creator.ready,
                  strikes: state.creator.strikes,
                },
                joiner: null,
              },
              createdAt: new Date(state.createdAt).toISOString(),
            },
            you: {
              sessionToken: state.creator.sessionToken,
              nickname: state.creator.nickname,
              connected: state.creator.connected,
              ready: state.creator.ready,
              strikes: state.creator.strikes,
            },
          });
        }

        await saveRoom(state);

        // Send the snapshot to the recipient
        socket.emit('room_state', toRoomStateView(state, token));
      });

      registerSocketHandlers(socket);

      socket.on('disconnect', async () => {
        try {
          const code = socket.data.roomCode as string | undefined;
          if (!code) return;
          await withRoomLock(code, async () => {
            const state = await loadRoom(code);
            if (!state) return;
            const player = playerByToken(state, token);
            if (!player) return;
            // If a newer tab still has the active tab id, ignore disconnect
            const currentTab = await getSessionTab(token);
            if (currentTab && currentTab !== socket.data.tabId) return;
            player.connected = false;
            const graceEnds = Date.now() + DISCONNECT_GRACE_MS;
            player.disconnectGraceEndsAt = graceEnds;
            scheduleTimer(code, 'disconnect_grace', token, graceEnds);
            broadcastToRoom(code, 'player_disconnected', {
              playerToken: token,
              graceRemainingSeconds: Math.round(DISCONNECT_GRACE_MS / 1000),
              graceEndsAt: new Date(graceEnds).toISOString(),
            });
            await saveRoom(state);
          });
        } catch (err) {
          logger.error({ err }, 'disconnect handler error');
        }
      });
    } catch (err) {
      logger.error({ err }, 'connection handler error');
      socket.disconnect(true);
    }
  });

  return io;
}
