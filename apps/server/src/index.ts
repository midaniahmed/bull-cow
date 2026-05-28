import Fastify from 'fastify';
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
import { attachSocketServer } from './sockets/index.js';
import { installTimerHandler } from './rooms/timer-handler.js';

async function main() {
  const app = Fastify({
    loggerInstance: logger,
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
