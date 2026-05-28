import type { Socket } from 'socket.io';
import {
  C2S_EVENTS,
  NonceOnlySchema,
  ToggleReadySchema,
  SecretSubmitSchema,
  RPSPickPayloadSchema,
  GuessSubmitSchema,
  EmoteSendSchema,
  MuteToggleSchema,
  RematchRespondSchema,
  type AckResult,
} from '@bc/shared';
import { wrapHandler, Ack } from './wrap.js';
import {
  applyRematch,
  closeRoom,
  forfeitMatch,
  startSecretsStage,
  submitGuess,
  submitRPSPick,
  submitSecret,
} from '../match/engine.js';
import { broadcastToRoom, emitToToken } from '../rooms/broadcast.js';
import { toRoomStateView } from '../rooms/view.js';
import { bothPlayers, opponentTokenOf, playerByToken } from '../rooms/room-state.js';
import { redis, RKEY, TTL_SECONDS } from '../redis/client.js';
import { checkEmoteRateLimit } from '../auth/rate-limit.js';
import { clearSessionRoom, setSessionTab } from '../auth/session.js';
import { saveRoom } from '../rooms/store.js';

export function registerSocketHandlers(socket: Socket) {
  socket.on(C2S_EVENTS.ROOM_LEAVE, (payload, ack) => {
    void wrapHandler(NonceOnlySchema, 'leave', async (ctx) => {
      const { state, sessionToken } = ctx;
      if (state.stage === 'waiting') {
        if (state.creator.sessionToken === sessionToken) {
          await closeRoom(state, 'creator_left_waiting');
          await clearSessionRoom(sessionToken);
          return Ack.ok();
        }
      }
      if (state.stage === 'lobby') {
        if (state.creator.sessionToken === sessionToken) {
          const joinerToken = state.joiner?.sessionToken;
          await closeRoom(state, 'creator_left_lobby');
          await clearSessionRoom(sessionToken);
          if (joinerToken) await clearSessionRoom(joinerToken);
          return Ack.ok();
        }
        if (state.joiner && state.joiner.sessionToken === sessionToken) {
          state.joiner = null;
          state.stage = 'waiting';
          state.creator.ready = false;
          await clearSessionRoom(sessionToken);
          // broadcast updated room state
          for (const p of bothPlayers(state)) {
            emitToToken(state.code, p.sessionToken, 'room_state', toRoomStateView(state, p.sessionToken));
          }
          return Ack.ok();
        }
      }
      if (state.stage === 'secrets' || state.stage === 'rps' || state.stage === 'playing') {
        await forfeitMatch(state, sessionToken, 'voluntary');
        await clearSessionRoom(sessionToken);
        return Ack.ok();
      }
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.ROOM_KICK_JOINER, (payload, ack) => {
    void wrapHandler(NonceOnlySchema, 'kick', async (ctx) => {
      const { state, sessionToken } = ctx;
      if (state.stage !== 'lobby') return Ack.err('bad_stage', 'wrong stage');
      if (state.creator.sessionToken !== sessionToken)
        return Ack.err('forbidden', 'not creator');
      if (!state.joiner) return Ack.err('forbidden', 'no joiner');
      const joinerToken = state.joiner.sessionToken;
      // Notify the kicked player explicitly
      emitToToken(state.code, joinerToken, 'room_closed', { reason: 'kicked' });
      await clearSessionRoom(joinerToken);
      state.joiner = null;
      state.stage = 'waiting';
      state.creator.ready = false;
      for (const p of bothPlayers(state)) {
        emitToToken(state.code, p.sessionToken, 'room_state', toRoomStateView(state, p.sessionToken));
      }
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.ROOM_TOGGLE_READY, (payload, ack) => {
    void wrapHandler(ToggleReadySchema, 'ready', async (ctx) => {
      const { state, sessionToken, parsed } = ctx;
      if (state.stage !== 'lobby') return Ack.err('bad_stage', 'wrong stage');
      const player = playerByToken(state, sessionToken);
      if (!player) return Ack.err('forbidden', 'not a member');
      player.ready = parsed.ready;
      broadcastToRoom(state.code, 'player_ready', {
        playerToken: sessionToken,
        ready: parsed.ready,
      });
      const both = bothPlayers(state);
      if (both.length === 2 && both.every((p) => p.ready)) {
        await startSecretsStage(state);
      }
      return { ok: true, ready: parsed.ready } as AckResult;
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.ROOM_RECLAIM_TAB, (payload, ack) => {
    void wrapHandler(NonceOnlySchema, 'reclaim_tab', async (ctx) => {
      const { socket: s, sessionToken, state } = ctx;
      const data = s.data as { tabId?: string };
      const tabId = data.tabId ?? '';
      await setSessionTab(sessionToken, tabId);
      // Demote any other socket for this token in the room
      const channel = `room:${state.code}`;
      const sids = (s.nsp.adapter.rooms.get(channel) ?? new Set<string>()) as Set<string>;
      for (const sid of sids) {
        if (sid === s.id) continue;
        const other = s.nsp.sockets.get(sid);
        if (other && (other.data as { sessionToken?: string }).sessionToken === sessionToken) {
          other.emit('tab_demoted', { reason: 'newer_tab_connected' });
        }
      }
      // Send fresh state
      s.emit('room_state', toRoomStateView(state, sessionToken));
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.SECRET_SUBMIT, (payload, ack) => {
    void wrapHandler(SecretSubmitSchema, 'secret', async (ctx) => {
      const { state, sessionToken, parsed } = ctx;
      const r = await submitSecret(state, sessionToken, parsed.value);
      if (!r.ok) return Ack.err(r.code as never, 'secret invalid', r.field);
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.RPS_PICK, (payload, ack) => {
    void wrapHandler(
      RPSPickPayloadSchema,
      (_p, state) => `rps:${state.match?.rpsRound ?? 1}`,
      async (ctx) => {
        const { state, sessionToken, parsed } = ctx;
        const r = await submitRPSPick(state, sessionToken, parsed.pick);
        if (!r.ok) return Ack.err(r.code as never, 'rps');
        return Ack.ok();
      }
    )(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.GUESS_SUBMIT, (payload, ack) => {
    void wrapHandler(
      GuessSubmitSchema,
      (_p, state) => {
        const m = state.match;
        if (state.settings.match.turnSystem === 'simultaneous') {
          return `guess:round:${m?.roundIndex ?? 0}`;
        }
        return `guess:${m?.turnIndex ?? 0}`;
      },
      async (ctx) => {
        const { state, sessionToken, parsed } = ctx;
        const r = await submitGuess(state, sessionToken, parsed.value);
        if (!r.ok) return Ack.err(r.code as never, 'guess', r.field);
        return Ack.ok();
      }
    )(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.FORFEIT, (payload, ack) => {
    void wrapHandler(NonceOnlySchema, 'forfeit', async (ctx) => {
      const { state, sessionToken } = ctx;
      if (state.stage !== 'secrets' && state.stage !== 'rps' && state.stage !== 'playing') {
        return Ack.err('bad_stage', 'wrong stage');
      }
      await forfeitMatch(state, sessionToken, 'voluntary');
      await clearSessionRoom(sessionToken);
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.EMOTE_SEND, (payload, ack) => {
    void wrapHandler(EmoteSendSchema, 'emote', async (ctx) => {
      const { state, sessionToken, parsed } = ctx;
      if (state.stage === 'waiting' || state.stage === 'abandoned') {
        return Ack.err('bad_stage', 'wrong stage');
      }
      if (!(await checkEmoteRateLimit(state.code, sessionToken))) {
        return Ack.err('emote_rate_limited', 'too many');
      }
      broadcastToRoom(state.code, 'emote_sent', {
        fromToken: sessionToken,
        code: parsed.code,
        sentAt: new Date().toISOString(),
      });
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.MUTE_TOGGLE, (payload, ack) => {
    void wrapHandler(MuteToggleSchema, 'mute', async (ctx) => {
      const { sessionToken, state, parsed } = ctx;
      const key = RKEY.sessionMuted(sessionToken);
      if (parsed.muted) {
        await redis.sadd(key, state.code);
      } else {
        await redis.srem(key, state.code);
      }
      await redis.expire(key, TTL_SECONDS.roomActive);
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.REMATCH_OFFER, (payload, ack) => {
    void wrapHandler(NonceOnlySchema, 'rematch', async (ctx) => {
      const { state, sessionToken } = ctx;
      if (state.stage !== 'ended' || !state.match) return Ack.err('bad_stage', 'wrong stage');
      state.match.rematchOffers[sessionToken] = true;
      broadcastToRoom(state.code, 'rematch_offered', { fromToken: sessionToken });
      const opp = opponentTokenOf(state, sessionToken);
      if (opp && state.match.rematchOffers[opp]) {
        await applyRematch(state);
      }
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.REMATCH_RESPOND, (payload, ack) => {
    void wrapHandler(RematchRespondSchema, 'rematch_respond', async (ctx) => {
      const { state, sessionToken, parsed } = ctx;
      if (state.stage !== 'ended' || !state.match) return Ack.err('bad_stage', 'wrong stage');
      if (parsed.accept) {
        state.match.rematchOffers[sessionToken] = true;
        const opp = opponentTokenOf(state, sessionToken);
        if (opp && state.match.rematchOffers[opp]) {
          await applyRematch(state);
        }
      } else {
        broadcastToRoom(state.code, 'rematch_declined', { fromToken: sessionToken });
      }
      return Ack.ok();
    })(socket, payload, ack);
  });

  socket.on(C2S_EVENTS.STATE_REQUEST, (payload, ack) => {
    void wrapHandler(NonceOnlySchema, 'state_req', async (ctx) => {
      const { state, sessionToken } = ctx;
      const view = toRoomStateView(state, sessionToken);
      return { ok: true, state: view } as AckResult;
    })(socket, payload, ack);
  });
}
