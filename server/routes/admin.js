/**
 * Admin routes — password protected with secure token auth
 * Requires ADMIN_SECRET env var (no default fallback)
 */

const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
const { sendEmail } = require('../services/email');
const { v4: uuidv4 } = require('uuid');

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

// Get STRIPE_BETA_COUPON_ID from env
function getStripeBetaCouponId() {
  const couponId = process.env.STRIPE_BETA_COUPON_ID;
  if (!couponId) {
    throw new Error('STRIPE_BETA_COUPON_ID environment variable is required');
  }
  return couponId;
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

/**
 * Generate a random beta code using secure crypto.randomBytes
 * Format: BETA-XXXXXXXX (8 hex chars uppercase)
 */
function generateBetaCode() {
  return `BETA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Check if beta code already exists in database
 */
function betaCodeExists(db, code) {
  const result = db.prepare('SELECT 1 FROM beta_invites WHERE code = ? LIMIT 1').get(code);
  return !!result;
}

/**
 * Check if email already has an active invite
 */
function getExistingInvite(db, email) {
  return db.prepare(`
    SELECT id, email, code, status, created_at
    FROM beta_invites
    WHERE email = ? AND status IN ('pending', 'sent')
    LIMIT 1
  `).get(email);
}

/**
 * Generate unique beta code with collision retry (max 3 attempts)
 */
function generateUniqueBetaCode(db, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateBetaCode();
    if (!betaCodeExists(db, code)) {
      return code;
    }
  }
  throw new Error('Failed to generate unique beta code after 3 retries');
}

async function adminRoutes(fastify) {

  // Initialize beta_invites table if it doesn't exist
  try {
    const db = fastify.db;
    if (db) {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS beta_invites (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          code TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now')),
          sent_at TEXT,
          failed_at TEXT
        )
      `).run();
    }
  } catch (err) {
    fastify.log.error('Failed to initialize beta_invites table:', err);
  }

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

  // Beta invite: POST /api/admin/beta-invite
  fastify.post('/admin/beta-invite', async (req, reply) => {
    const token = req.headers['x-admin-token'];
    
    if (!token || !validateSessionToken(token)) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    const { email, force } = req.body || {};
    if (!email || !email.includes('@')) {
      reply.code(400);
      return { error: 'Invalid email address' };
    }

    const db = fastify.db;
    if (!db) {
      reply.code(500);
      return { error: 'Database connection not available' };
    }

    let inviteId = uuidv4();
    
    try {
      // Check for existing active invite (unless force override)
      const existing = getExistingInvite(db, email);
      if (existing && !force) {
        reply.code(409);
        return {
          error: 'Invite already exists for this email',
          existingCode: existing.code,
          existingStatus: existing.status,
          warning: 'Use { force: true } to override'
        };
      }

      // Generate unique beta code (retry up to 3 times)
      const betaCode = generateUniqueBetaCode(db);

      // Step 1: Insert DB row with status='pending' FIRST (before Stripe creation)
      db.prepare(`
        INSERT INTO beta_invites (id, email, code, status, created_at)
        VALUES (?, ?, ?, 'pending', datetime('now'))
      `).run(inviteId, email, betaCode);

      fastify.log.info(`[BETA] DB record created (pending) for ${email} with code ${betaCode}`);

      // Step 2: Create Stripe promo code
      const couponId = getStripeBetaCouponId();
      const promoCode = await stripe.promotionCodes.create({
        coupon: couponId,
        code: betaCode,
      });

      fastify.log.info(`[BETA] Created Stripe promo code ${betaCode} for ${email}`);

      // Step 3: Send invite email
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Georgia, serif; background: #faf8f5; padding: 40px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
            h1 { color: #2d4a3e; font-size: 24px; }
            p { color: #4a4a4a; line-height: 1.6; }
            .code-box { background: #f5f3f0; border-left: 4px solid #4a7c59; padding: 16px; margin: 24px 0; font-size: 18px; font-weight: bold; color: #2d4a3e; }
            .button { display: inline-block; background: #4a7c59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're invited to The Plot Line</h1>
            <p>We'd love to have you join us for a month of free garden conversations.</p>
            <p>Use this code at checkout:</p>
            <div class="code-box">${betaCode}</div>
            <p>This gives you one month free. Start your journey:</p>
            <a href="https://theplotline.net/?email=${encodeURIComponent(email)}" class="button">Sign Up for The Plot Line</a>
            <div class="footer">
              <p>Any questions? Reply to this email or reach out to hello@theplotline.net</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `You're invited to The Plot Line!

We'd love to have you join us for a month of free garden conversations.

Use this code at checkout: ${betaCode}

This gives you one month free. Start your journey:
https://theplotline.net

Any questions? Reply to this email or reach out to hello@theplotline.net`;

      await sendEmail({
        to: email,
        subject: "You're invited to The Plot Line — one month free",
        html,
        text
      });

      fastify.log.info(`[BETA] Sent invite email to ${email}`);

      // Step 4: Update DB status to 'sent'
      db.prepare(`
        UPDATE beta_invites
        SET status = 'sent', sent_at = datetime('now')
        WHERE id = ?
      `).run(inviteId);

      return { success: true, code: betaCode, email, status: 'sent' };

    } catch (err) {
      fastify.log.error('Beta invite error:', err);
      
      // If DB record was created, mark as failed
      try {
        db.prepare(`
          UPDATE beta_invites
          SET status = 'failed', failed_at = datetime('now')
          WHERE id = ?
        `).run(inviteId);
      } catch (updateErr) {
        fastify.log.error('Failed to update beta invite status to failed:', updateErr);
      }

      reply.code(500);
      // Return generic error message to client, keep full error server-side only
      return { error: 'Failed to send beta invite' };
    }
  });

  // Beta invites list: GET /api/admin/beta-invites
  fastify.get('/admin/beta-invites', async (req, reply) => {
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
      const invites = db.prepare(`
        SELECT email, code, status, created_at, sent_at, failed_at
        FROM beta_invites
        ORDER BY created_at DESC
      `).all();

      return { invites };
    } catch (err) {
      fastify.log.error('Beta invites list error:', err);
      reply.code(500);
      return { error: 'Failed to fetch beta invites' };
    }
  });
}

module.exports = adminRoutes;
