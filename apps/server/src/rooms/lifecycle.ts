import crypto from 'node:crypto';
import { generateRoomCode } from '@bc/shared';
import { reserveCode, isCodeActive } from './store.js';

export async function allocateUniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode((n) => new Uint8Array(crypto.randomBytes(n)));
    if (!(await isCodeActive(code))) {
      const reserved = await reserveCode(code);
      if (reserved) return code;
    }
  }
  throw new Error('failed_to_allocate_room_code');
}
