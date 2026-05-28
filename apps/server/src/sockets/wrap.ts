import type { Socket } from 'socket.io';
import type { z } from 'zod';
import { withRoomLock } from '../rooms/lock.js';
import { loadRoom, saveRoom } from '../rooms/store.js';
import type { RoomState } from '../rooms/room-state.js';
import { checkGlobalRateLimit, checkNonce } from '../auth/rate-limit.js';
import type { AckResult, ErrorCode } from '@bc/shared';
import { logger } from '../logger.js';

export type SocketData = {
  sessionToken?: string;
  tabId?: string;
  roomCode?: string;
};

export type HandlerCtx<TParsed> = {
  socket: Socket;
  sessionToken: string;
  roomCode: string;
  state: RoomState;
  parsed: TParsed;
};

export type HandlerResult = AckResult | Promise<AckResult>;

function err(code: ErrorCode, message: string, field?: string): AckResult {
  return { ok: false, code, message, ...(field ? { field } : {}) };
}

export function wrapHandler<S extends z.ZodTypeAny>(
  schema: S,
  scope: string | ((parsed: z.infer<S>, state: RoomState) => string),
  body: (ctx: HandlerCtx<z.infer<S>>) => HandlerResult
) {
  return async (socket: Socket, payload: unknown, ack: (r: AckResult) => void) => {
    const data = socket.data as SocketData;
    const token = data.sessionToken;
    const code = data.roomCode;
    if (!token) return ack(err('session_invalid', 'no session'));
    if (!code) return ack(err('forbidden', 'no room context'));

    try {
      if (!(await checkGlobalRateLimit(token))) {
        return ack(err('msg_rate_limited', 'rate limited'));
      }
    } catch (err2) {
      logger.error({ err: err2 }, 'rate limit check failed');
    }

    const parseRes = schema.safeParse(payload);
    if (!parseRes.success) {
      return ack(err('forbidden', parseRes.error.message));
    }
    const parsed = parseRes.data as z.infer<S>;

    let result: AckResult;
    try {
      result = await withRoomLock(code, async () => {
        const state = await loadRoom(code);
        if (!state) return err('room_not_found', 'no room');
        const scopeStr = typeof scope === 'function' ? scope(parsed, state) : scope;
        const nonce = (parsed as { nonce?: string }).nonce;
        if (nonce) {
          const fresh = await checkNonce(code, token, scopeStr, nonce);
          if (!fresh) return { ok: true } as AckResult;
        }
        const r = await body({ socket, sessionToken: token, roomCode: code, state, parsed });
        await saveRoom(state);
        return r;
      });
    } catch (e) {
      logger.error({ err: e, code, token }, 'handler error');
      result = err('internal', 'internal error');
    }
    ack(result);
  };
}

export const Ack = {
  ok(extra: Record<string, unknown> = {}): AckResult {
    return { ok: true, ...extra } as AckResult;
  },
  err,
};
