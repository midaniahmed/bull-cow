import type { FastifyInstance } from 'fastify';
import { redis } from '../redis/client.js';

const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    let redisStatus: 'ok' | 'degraded' = 'ok';
    try {
      const r = await redis.ping();
      if (r !== 'PONG') redisStatus = 'degraded';
    } catch {
      redisStatus = 'degraded';
    }
    return {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
      redis: redisStatus,
      db: 'ok',
    };
  });
}
