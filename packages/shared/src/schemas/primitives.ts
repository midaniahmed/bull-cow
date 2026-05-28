import { z } from 'zod';
import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH } from '../game/codes.js';

export const SessionTokenSchema = z
  .string()
  .min(20)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const NicknameSchema = z
  .string()
  .trim()
  .min(2, 'Must be 2–20 characters')
  .max(20, 'Must be 2–20 characters')
  .regex(/^[a-zA-Z0-9 ._-]+$/, 'Allowed: letters, digits, space, . _ -');

const roomCodeChars = ROOM_CODE_CHARSET;
const roomCodeRegex = new RegExp(`^[${roomCodeChars}]+$`);

export const RoomCodeSchema = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .regex(roomCodeRegex, 'Invalid room code');

export const NonceSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid nonce'
  );

export const TimestampSchema = z.string().datetime({ offset: true });
