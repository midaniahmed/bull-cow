import { redis, RKEY, TTL_SECONDS } from '../redis/client.js';
import type { RoomState } from './room-state.js';
import type { RoomStage } from '@bc/shared';

function ttlForStage(stage: RoomStage): number {
  switch (stage) {
    case 'waiting':
      return TTL_SECONDS.roomWaiting;
    case 'lobby':
      return TTL_SECONDS.roomLobby;
    case 'secrets':
    case 'rps':
    case 'playing':
      return TTL_SECONDS.roomActive;
    case 'ended':
      return TTL_SECONDS.roomEnded;
    case 'abandoned':
      return TTL_SECONDS.roomAbandoned;
  }
}

export async function loadRoom(code: string): Promise<RoomState | null> {
  const raw = await redis.get(RKEY.room(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    return null;
  }
}

export async function saveRoom(state: RoomState): Promise<void> {
  const ttl = ttlForStage(state.stage);
  await redis.set(RKEY.room(state.code), JSON.stringify(state), 'EX', ttl);
}

export async function deleteRoom(code: string): Promise<void> {
  const keys = [
    RKEY.room(code),
    RKEY.roomGuessLog(code),
    RKEY.roomRematchHistory(code),
  ];
  await Promise.all([
    redis.del(...keys),
    redis.srem(RKEY.roomCodesActive, code),
  ]);
}

export async function isCodeActive(code: string): Promise<boolean> {
  const r = await redis.sismember(RKEY.roomCodesActive, code);
  return r === 1;
}

export async function reserveCode(code: string): Promise<boolean> {
  const r = await redis.sadd(RKEY.roomCodesActive, code);
  return r === 1;
}

export async function freeCode(code: string): Promise<void> {
  await redis.srem(RKEY.roomCodesActive, code);
}

export async function listActiveRoomCodes(): Promise<string[]> {
  return redis.smembers(RKEY.roomCodesActive);
}
