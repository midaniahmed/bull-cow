import type { FastifyInstance } from 'fastify';
import { sessionRoutes } from './session.js';
import { roomRoutes } from './rooms.js';
import { healthRoutes } from './health.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(sessionRoutes);
  await app.register(roomRoutes);
  await app.register(healthRoutes);
}
