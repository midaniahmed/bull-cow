export const ROOM_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export function isValidRoomCode(value: string): boolean {
  if (value.length !== ROOM_CODE_LENGTH) return false;
  for (const c of value) {
    if (!ROOM_CODE_CHARSET.includes(c)) return false;
  }
  return true;
}

export function generateRoomCode(
  getRandomBytes: (n: number) => Uint8Array
): string {
  const N = ROOM_CODE_CHARSET.length; // 31
  const cap = Math.floor(256 / N) * N; // 248
  const out: string[] = [];

  while (out.length < ROOM_CODE_LENGTH) {
    const needed = ROOM_CODE_LENGTH - out.length;
    const bytes = getRandomBytes(needed * 2);
    for (let i = 0; i < bytes.length && out.length < ROOM_CODE_LENGTH; i++) {
      const b = bytes[i] as number;
      if (b < cap) {
        out.push(ROOM_CODE_CHARSET[b % N] as string);
      }
    }
  }
  return out.join('');
}
