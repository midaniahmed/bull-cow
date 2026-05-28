import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

export const redisPub = new Redis(config.redisUrl, { lazyConnect: false });
export const redisSub = new Redis(config.redisUrl, { lazyConnect: false });

export const RKEY = {
  session: (token: string) => `bc:session:${token}`,
  sessionRoom: (token: string) => `bc:session:${token}:room`,
  sessionTab: (token: string) => `bc:session:${token}:tab`,
  sessionMuted: (token: string) => `bc:session:${token}:mutedIn`,
  room: (code: string) => `bc:room:${code}`,
  roomGuessLog: (code: string) => `bc:room:${code}:guess_log`,
  roomRematchHistory: (code: string) => `bc:room:${code}:rematch_history`,
  roomNonces: (code: string, token: string, scope: string) =>
    `bc:room:${code}:nonces:${token}:${scope}`,
  roomEmotes: (code: string, token: string) => `bc:room:${code}:emotes:${token}`,
  roomResubmits: (code: string, token: string, round: number) =>
    `bc:room:${code}:resubmits:${token}:${round}`,
  rateLimitMsg: (token: string) => `bc:ratelimit:msg:${token}`,
  roomCodesActive: 'bc:roomcodes:active',
};

export const TTL_SECONDS = {
  session: 30 * 24 * 60 * 60,
  roomWaiting: 6 * 60,
  roomLobby: 5 * 60,
  roomActive: 10 * 60,
  roomEnded: 10 * 60,
  roomAbandoned: 10 * 60,
  sessionTab: 60,
};
