export const ERROR_CODES = [
  'session_invalid',
  'nickname_invalid',
  'room_not_found',
  'room_full',
  'room_in_progress',
  'room_ended',
  'room_already_member',
  'room_other_active',
  'settings_invalid',
  'secret_invalid',
  'secret_already_locked',
  'guess_invalid',
  'not_your_turn',
  'rps_invalid',
  'rps_already_locked',
  'emote_rate_limited',
  'submit_rate_limited',
  'msg_rate_limited',
  'nonce_replay',
  'forbidden',
  'tab_not_active',
  'bad_stage',
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorAck = {
  ok: false;
  code: ErrorCode;
  message: string;
  field?: string;
};

export type OkAck<T = Record<string, unknown>> = { ok: true } & T;

export type AckResult<T = Record<string, unknown>> = OkAck<T> | ErrorAck;
