/**
 * Admin routes — password protected with secure token auth
 * Requires ADMIN_SECRET env var (no default fallback)
 */

const crypto = require('crypto');

// In-memory session tokens (map: token -> { createdAt, expiresAt })
const sessionTokens = new Map();
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Require ADMIN_SECRET to be configured
function getAdminSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SECRET environment variable is required for admin panel');
  }
  return secret;
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  sessionTokens.set(token, {
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS
  });
  // Cleanup old tokens periodically
  if (sessionTokens.size > 1000) {
    for (const [t, metadata] of sessionTokens.entries()) {
      if (metadata.expiresAt < now) {
        sessionTokens.delete(t);
      }
    }
  }
  return token;
}

/**
 * Validate a session token
 */
function validateSessionToken(token) {
  const metadata = sessionTokens.get(token);
  if (!metadata) return false;
  if (metadata.expiresAt < Date.now()) {
    sessionTokens.delete(token);
    return false;
  }
  return true;
}

async function adminRoutes(fastify) {

  // Auth check
  fastify.post('/admin/login', async (req, reply) => {
    const { password } = req.body || {};
    const adminSecret = getAdminSecret();
    
    if (!password || password !== adminSecret) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    const token = generateSessionToken();
    return { ok: true, token };
  });

  // Stats endpoint
  fastify.get('/admin/stats', async (req, reply) => {
    const token = req.headers['x-admin-token'];
    
    if (!token || !validateSessionToken(token)) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    const db = fastify.db;
    if (!db) {
      reply.code(500);
      return { error: 'Database connection not available' };
    }

    try {
      const totalSubscribers = db.prepare('SELECT COUNT(*) as n FROM subscribers').get().n;
      const confirmed = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE confirmed_at IS NOT NULL').get().n;
      const active = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE active=1 AND confirmed_at IS NOT NULL').get().n;
      const today = new Date().toISOString().slice(0,10);
      const newToday = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE date(created_at)=?').get(today).n;

      const byZone = db.prepare(`
        SELECT climate_zone_id, COUNT(*) as n 
        FROM subscribers 
        WHERE confirmed_at IS NOT NULL
        GROUP BY climate_zone_id 
        ORDER BY n DESC
      `).all();

      const recentSubs = db.prepare(`
        SELECT email, location_city, location_country, climate_zone_id, created_at 
        FROM subscribers 
        ORDER BY created_at DESC 
        LIMIT 10
      `).all();

      return {
        subscribers: { total: totalSubscribers, confirmed, active, newToday },
        byZone,
        recentSubs,
        serverTime: new Date().toISOString(),
      };
    } catch (err) {
      fastify.log.error('Admin stats error:', err);
      reply.code(500);
      return { error: 'Failed to fetch stats' };
    }
  });
}

module.exports = adminRoutes;
