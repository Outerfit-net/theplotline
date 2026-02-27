/**
 * Plot Lines - Fastify Server
 * Garden dialog newsletter API
 */

require('dotenv').config();

const fastify = require('fastify')({
  logger: true
});
const cors = require('@fastify/cors');

const subscriberRoutes = require('./routes/subscribers');
const authorRoutes = require('./routes/authors');
const { registerCrons } = require('./cron');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function start() {
  // Register CORS
  await fastify.register(cors, {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  fastify.register(subscriberRoutes, { prefix: '/api' });
  fastify.register(authorRoutes, { prefix: '/api' });

  // Register cron jobs
  registerCrons();

  // Start server
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
