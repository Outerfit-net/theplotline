/**
 * The Plot Line - Fastify Server
 * Garden dialog newsletter API
 */

require('dotenv').config();

const fastify = require('fastify')({
  logger: true,
  bodyLimit: 1048576,
});
const cors = require('@fastify/cors');
const staticFiles = require('@fastify/static');
const path = require('path');

// Database setup - PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://plotlines:plines2026@localhost:5432/plotlines',
});

const db = {
  prepare: (sql) => ({
    run: (...params) => pool.query(sql, params),
    get: async (...params) => {
      const result = await pool.query(sql, params);
      return result.rows[0];
    },
    all: async (...params) => {
      const result = await pool.query(sql, params);
      return result.rows;
    },
  }),
  query: (...args) => pool.query(...args),
  close: () => pool.end(),
};

const subscriberRoutes = require('./routes/subscribers');
const authorRoutes = require('./routes/authors');
const stripeRoutes = require('./routes/stripe');
const { registerCrons } = require('./cron');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function start() {
  // Initialize shared database connection
  fastify.decorate('db', db);

  // Security headers
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  });

  // Register CORS
  await fastify.register(cors, {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  });

  // Serve masthead images
  await fastify.register(staticFiles, {
    root: path.join(__dirname, '..', 'data', 'mastheads'),
    prefix: '/mastheads/',
    decorateReply: false,
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  fastify.register(subscriberRoutes, { prefix: '/api' });
  fastify.register(authorRoutes, { prefix: '/api' });
  fastify.register(require('./routes/admin'), { prefix: '/api' });
  fastify.register(stripeRoutes, { prefix: '/api' });

  // Register cron jobs
  registerCrons();

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await pool.end();
  });

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
