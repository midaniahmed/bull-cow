import crypto from 'node:crypto';
import { redis, RKEY, TTL_SECONDS } from '../redis/client.js';

export type SessionRecord = {
  nickname: string;
  createdAt: number;
  lastSeenAt: number;
};

export const SESSION_COOKIE_NAME = 'bc_session';

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function readSession(token: string | undefined | null): Promise<SessionRecord | null> {
  if (!token) return null;
  const data = await redis.hgetall(RKEY.session(token));
  if (!data || !data['nickname']) return null;
  return {
    nickname: data['nickname'],
    createdAt: Number(data['createdAt'] ?? 0),
    lastSeenAt: Number(data['lastSeenAt'] ?? 0),
  };
}

export async function writeSession(
  token: string,
  nickname: string,
  isNew: boolean
): Promise<SessionRecord> {
  const now = Date.now();
  const created = isNew ? now : Number((await redis.hget(RKEY.session(token), 'createdAt')) ?? now);
  await redis
    .multi()
    .hset(RKEY.session(token), {
      nickname,
      createdAt: String(created),
      lastSeenAt: String(now),
    })
    .expire(RKEY.session(token), TTL_SECONDS.session)
    .exec();
  return { nickname, createdAt: created, lastSeenAt: now };
}

export async function touchSession(token: string): Promise<void> {
  const now = Date.now();
  await redis
    .multi()
    .hset(RKEY.session(token), 'lastSeenAt', String(now))
    .expire(RKEY.session(token), TTL_SECONDS.session)
    .exec();
}

export async function getSessionRoom(token: string): Promise<string | null> {
  return redis.get(RKEY.sessionRoom(token));
}

export async function setSessionRoom(token: string, code: string, ttlSec: number): Promise<void> {
  await redis.set(RKEY.sessionRoom(token), code, 'EX', ttlSec);
}

export async function clearSessionRoom(token: string): Promise<void> {
  await redis.del(RKEY.sessionRoom(token));
}

export async function setSessionTab(token: string, tabId: string): Promise<void> {
  await redis.set(RKEY.sessionTab(token), tabId, 'EX', TTL_SECONDS.sessionTab);
}

export async function getSessionTab(token: string): Promise<string | null> {
  return redis.get(RKEY.sessionTab(token));
}
