import { getSocket } from './client.js';
import type {
  AckResult,
  EmoteCode,
  RPSPick,
  RoomStateView,
} from '@bc/shared';
import { C2S_EVENTS } from '@bc/shared';

function nonce(): string {
  return crypto.randomUUID();
}

function ackPromise<T extends Record<string, unknown> = Record<string, unknown>>(
  event: string,
  payload: Record<string, unknown>
): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    const s = getSocket();
    if (!s) {
      resolve({ ok: false, code: 'internal', message: 'no socket' });
      return;
    }
    const timer = setTimeout(() => {
      resolve({ ok: false, code: 'internal', message: 'ack timeout' });
    }, 5000);
    (s as unknown as { emit: (e: string, p: unknown, ack: (r: AckResult<T>) => void) => void }).emit(
      event,
      payload,
      (r: AckResult<T>) => {
        clearTimeout(timer);
        resolve(r);
      }
    );
  });
}

export const emit = {
  leaveRoom: () => ackPromise(C2S_EVENTS.ROOM_LEAVE, { nonce: nonce() }),
  kickJoiner: () => ackPromise(C2S_EVENTS.ROOM_KICK_JOINER, { nonce: nonce() }),
  toggleReady: (ready: boolean) =>
    ackPromise<{ ready: boolean }>(C2S_EVENTS.ROOM_TOGGLE_READY, { nonce: nonce(), ready }),
  reclaimTab: () => ackPromise(C2S_EVENTS.ROOM_RECLAIM_TAB, { nonce: nonce() }),
  submitSecret: (value: string) =>
    ackPromise(C2S_EVENTS.SECRET_SUBMIT, { nonce: nonce(), value }),
  rpsPick: (pick: RPSPick) => ackPromise(C2S_EVENTS.RPS_PICK, { nonce: nonce(), pick }),
  submitGuess: (value: string) =>
    ackPromise(C2S_EVENTS.GUESS_SUBMIT, { nonce: nonce(), value }),
  forfeit: () => ackPromise(C2S_EVENTS.FORFEIT, { nonce: nonce() }),
  sendEmote: (code: EmoteCode) =>
    ackPromise(C2S_EVENTS.EMOTE_SEND, { nonce: nonce(), code }),
  toggleMute: (muted: boolean) =>
    ackPromise(C2S_EVENTS.MUTE_TOGGLE, { nonce: nonce(), muted }),
  rematchOffer: () => ackPromise(C2S_EVENTS.REMATCH_OFFER, { nonce: nonce() }),
  rematchRespond: (accept: boolean) =>
    ackPromise(C2S_EVENTS.REMATCH_RESPOND, { nonce: nonce(), accept }),
  stateRequest: () =>
    ackPromise<{ state: RoomStateView }>(C2S_EVENTS.STATE_REQUEST, { nonce: nonce() }),
};
