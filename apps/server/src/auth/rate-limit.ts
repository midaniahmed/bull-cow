import { redis, RKEY } from '../redis/client.js';

const GLOBAL_LIMIT = 100;
const GLOBAL_WINDOW_MS = 60_000;

const EMOTE_LIMIT = 5;
const EMOTE_WINDOW_MS = 30_000;

export async function checkGlobalRateLimit(token: string): Promise<boolean> {
  const key = RKEY.rateLimitMsg(token);
  const now = Date.now();
  const cutoff = now - GLOBAL_WINDOW_MS;
  const pipeline = redis.multi();
  pipeline.zremrangebyscore(key, 0, cutoff);
  pipeline.zcard(key);
  const result = await pipeline.exec();
  const count = (result?.[1]?.[1] as number) ?? 0;
  if (count >= GLOBAL_LIMIT) return false;
  await redis.multi().zadd(key, now, `${now}:${Math.random()}`).expire(key, 120).exec();
  return true;
}

export async function checkEmoteRateLimit(code: string, token: string): Promise<boolean> {
  const key = RKEY.roomEmotes(code, token);
  const now = Date.now();
  const cutoff = now - EMOTE_WINDOW_MS;
  const pipeline = redis.multi();
  pipeline.zremrangebyscore(key, 0, cutoff);
  pipeline.zcard(key);
  const result = await pipeline.exec();
  const count = (result?.[1]?.[1] as number) ?? 0;
  if (count >= EMOTE_LIMIT) return false;
  await redis.multi().zadd(key, now, `${now}:${Math.random()}`).expire(key, 60).exec();
  return true;
}

export async function checkNonce(
  code: string,
  token: string,
  scope: string,
  nonce: string,
  ttlSec = 600
): Promise<boolean> {
  const key = RKEY.roomNonces(code, token, scope);
  const added = await redis.sadd(key, nonce);
  await redis.expire(key, ttlSec);
  return added === 1;
}
