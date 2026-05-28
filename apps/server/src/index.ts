import Fastify, { type FastifyBaseLogger } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { config } from './config.js';
import { logger } from './logger.js';
import { registerRoutes } from './routes/index.js';
import { registerStatic } from './static.js';
import { attachSocketServer } from './sockets/index.js';
import { installTimerHandler } from './rooms/timer-handler.js';

async function main() {
  const app = Fastify({
    // pino's Logger type isn't structurally identical to FastifyBaseLogger
    // (it lacks `msgPrefix`); narrow at this boundary so the app instance stays
    // assignable to the plain FastifyInstance params used across the codebase.
    loggerInstance: logger as FastifyBaseLogger,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cookie, {});
  await app.register(cors, {
    origin: config.clientOrigin,
    credentials: true,
  });

  await registerRoutes(app);
  await registerStatic(app);

  await app.ready();
  installTimerHandler();
  attachSocketServer(app.server);

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ port: config.port }, 'server listening');
}

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
