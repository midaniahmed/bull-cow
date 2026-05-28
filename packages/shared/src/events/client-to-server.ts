import { z } from 'zod';
import { NonceSchema } from '../schemas/primitives.js';
import { RPSPickSchema } from '../schemas/rps.js';
import { EmoteCodeSchema } from '../schemas/emote.js';
import type { AckResult } from '../errors.js';
import type { RoomStateView } from '../views.js';

export const C2S_EVENTS = {
  ROOM_LEAVE: 'room:leave',
  ROOM_KICK_JOINER: 'room:kick_joiner',
  ROOM_TOGGLE_READY: 'room:toggle_ready',
  ROOM_RECLAIM_TAB: 'room:reclaim_tab',
  SECRET_SUBMIT: 'secret:submit',
  RPS_PICK: 'rps:pick',
  GUESS_SUBMIT: 'guess:submit',
  FORFEIT: 'forfeit',
  EMOTE_SEND: 'emote:send',
  MUTE_TOGGLE: 'mute:toggle',
  REMATCH_OFFER: 'rematch:offer',
  REMATCH_RESPOND: 'rematch:respond',
  STATE_REQUEST: 'state:request',
} as const;

export type C2SEventName = (typeof C2S_EVENTS)[keyof typeof C2S_EVENTS];

export const NonceOnlySchema = z.object({ nonce: NonceSchema });
export const ToggleReadySchema = z.object({ nonce: NonceSchema, ready: z.boolean() });
export const SecretSubmitSchema = z.object({ nonce: NonceSchema, value: z.string() });
export const RPSPickPayloadSchema = z.object({ nonce: NonceSchema, pick: RPSPickSchema });
export const GuessSubmitSchema = z.object({ nonce: NonceSchema, value: z.string() });
export const EmoteSendSchema = z.object({ nonce: NonceSchema, code: EmoteCodeSchema });
export const MuteToggleSchema = z.object({ nonce: NonceSchema, muted: z.boolean() });
export const RematchRespondSchema = z.object({ nonce: NonceSchema, accept: z.boolean() });

export type NonceOnly = z.infer<typeof NonceOnlySchema>;
export type ToggleReady = z.infer<typeof ToggleReadySchema>;
export type SecretSubmit = z.infer<typeof SecretSubmitSchema>;
export type RPSPickPayload = z.infer<typeof RPSPickPayloadSchema>;
export type GuessSubmit = z.infer<typeof GuessSubmitSchema>;
export type EmoteSend = z.infer<typeof EmoteSendSchema>;
export type MuteToggle = z.infer<typeof MuteToggleSchema>;
export type RematchRespond = z.infer<typeof RematchRespondSchema>;

export type ClientToServerEvents = {
  'room:leave': (p: NonceOnly, ack: (r: AckResult) => void) => void;
  'room:kick_joiner': (p: NonceOnly, ack: (r: AckResult) => void) => void;
  'room:toggle_ready': (p: ToggleReady, ack: (r: AckResult<{ ready: boolean }>) => void) => void;
  'room:reclaim_tab': (p: NonceOnly, ack: (r: AckResult) => void) => void;
  'secret:submit': (p: SecretSubmit, ack: (r: AckResult) => void) => void;
  'rps:pick': (p: RPSPickPayload, ack: (r: AckResult) => void) => void;
  'guess:submit': (p: GuessSubmit, ack: (r: AckResult) => void) => void;
  forfeit: (p: NonceOnly, ack: (r: AckResult) => void) => void;
  'emote:send': (p: EmoteSend, ack: (r: AckResult) => void) => void;
  'mute:toggle': (p: MuteToggle, ack: (r: AckResult) => void) => void;
  'rematch:offer': (p: NonceOnly, ack: (r: AckResult) => void) => void;
  'rematch:respond': (p: RematchRespond, ack: (r: AckResult) => void) => void;
  'state:request': (
    p: NonceOnly,
    ack: (r: AckResult<{ state: RoomStateView }>) => void
  ) => void;
};
