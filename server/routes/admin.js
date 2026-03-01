/**
 * Admin routes — password protected
 * Simple password check via env var ADMIN_PASSWORD
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'plotlines-admin';

async function adminRoutes(fastify) {

  // Auth check
  fastify.post('/admin/login', async (req, reply) => {
    const { password } = req.body || {};
    if (password === ADMIN_PASSWORD) {
      return { ok: true, token: Buffer.from(ADMIN_PASSWORD).toString('base64') };
    }
    reply.code(401);
    return { error: 'Wrong password' };
  });

  // Stats endpoint
  fastify.get('/admin/stats', async (req, reply) => {
    const token = req.headers['x-admin-token'];
    if (token !== Buffer.from(ADMIN_PASSWORD).toString('base64')) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    const db = fastify.db || require('better-sqlite3')(process.env.DATABASE_PATH);

    const totalSubscribers = db.prepare('SELECT COUNT(*) as n FROM subscribers').get().n;
    const confirmed = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE confirmed=1').get().n;
    const active = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE active=1 AND confirmed=1').get().n;
    const today = new Date().toISOString().slice(0,10);
    const newToday = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE date(created_at)=?').get(today).n;

    const byZone = db.prepare(`
      SELECT climate_zone_id, COUNT(*) as n 
      FROM subscribers 
      WHERE confirmed=1 
      GROUP BY climate_zone_id 
      ORDER BY n DESC
    `).all();

    const recentSubs = db.prepare(`
      SELECT email, name, climate_zone_id, created_at 
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
  });
}

module.exports = adminRoutes;
