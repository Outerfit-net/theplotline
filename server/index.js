/**
 * The Plot Line - Fastify Server
 * Garden dialog newsletter API
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fastify = require('fastify')({
  logger: true,
  bodyLimit: 1048576,
});
const cors = require('@fastify/cors');
const staticFiles = require('@fastify/static');
const rateLimit = require('@fastify/rate-limit');
const rawBody = require('fastify-raw-body');
const path = require('path');

// Require DATABASE_URL — no hardcoded fallback
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Database setup - PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = {
  prepare: (sql) => {
    // Convert ? placeholders to $1, $2, ... for PostgreSQL
    let paramIndex = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
    return {
      run: (...params) => pool.query(pgSql, params),
      get: async (...params) => {
        const result = await pool.query(pgSql, params);
        return result.rows[0];
      },
      all: async (...params) => {
        const result = await pool.query(pgSql, params);
        return result.rows;
      },
    };
  },
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

  // Register raw body plugin (global: false — routes opt in via config.rawBody)
  await fastify.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // Register rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Security headers
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'");
  });

  // Register CORS — only include localhost origins in non-production
  const origins = [CLIENT_URL];
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:3000');
  }
  await fastify.register(cors, {
    origin: origins,
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
  registerCrons(db);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await pool.end();
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: process.env.HOST || '127.0.0.1' });
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
