import AsyncLock from 'async-lock';

const lock = new AsyncLock({ timeout: 5000, maxPending: 1000 });

export function withRoomLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  return lock.acquire(`room:${code}`, fn);
}
