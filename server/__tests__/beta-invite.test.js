/**
 * Tests for beta invite system and admin auth
 */

const { test, expect, describe, beforeEach, afterEach } = require('@jest/globals');
const { initTestDb } = require('./setup');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function getTestDb() {
  return initTestDb(':memory:');
}

// ── Admin auth logic (inline, matches admin.js) ───────────────────────────

const sessionTokens = new Map();
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function generateSessionToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  sessionTokens.set(token, { createdAt: now, expiresAt: now + SESSION_DURATION_MS });
  return token;
}

function validateSessionToken(token) {
  const metadata = sessionTokens.get(token);
  if (!metadata) return false;
  if (metadata.expiresAt < Date.now()) {
    sessionTokens.delete(token);
    return false;
  }
  return true;
}

function verifyAdminSecret(provided, actual) {
  if (!provided || !actual) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(actual));
  } catch {
    return false;
  }
}

// ── Beta invite DB logic (inline, matches admin.js behavior) ─────────────

function isBetaCode(code) {
  return typeof code === 'string' && code.startsWith('BETA-');
}

function recordBetaInvite(db, subscriberEmail, betaCode) {
  db.prepare('UPDATE subscribers SET beta_invite = ? WHERE email = ?')
    .run(betaCode, subscriberEmail);
}

function getBetaSubscribers(db) {
  return db.prepare('SELECT id, email, beta_invite FROM subscribers WHERE beta_invite IS NOT NULL').all();
}

// ── Admin Auth Tests ───────────────────────────────────────────────────────

describe('Admin: session token management', () => {
  beforeEach(() => sessionTokens.clear());

  test('generates a valid session token', () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(64); // 32 bytes hex
    expect(validateSessionToken(token)).toBe(true);
  });

  test('rejects unknown token', () => {
    expect(validateSessionToken('notarealtoken')).toBe(false);
  });

  test('rejects expired token', () => {
    const token = crypto.randomBytes(32).toString('hex');
    sessionTokens.set(token, { createdAt: Date.now() - 1000, expiresAt: Date.now() - 500 });
    expect(validateSessionToken(token)).toBe(false);
  });

  test('cleans up expired token on validation attempt', () => {
    const token = crypto.randomBytes(32).toString('hex');
    sessionTokens.set(token, { createdAt: 0, expiresAt: 0 });
    validateSessionToken(token);
    expect(sessionTokens.has(token)).toBe(false);
  });

  test('multiple tokens are independent', () => {
    const t1 = generateSessionToken();
    const t2 = generateSessionToken();
    expect(t1).not.toBe(t2);
    expect(validateSessionToken(t1)).toBe(true);
    expect(validateSessionToken(t2)).toBe(true);
  });
});

describe('Admin: secret verification', () => {
  test('accepts correct secret', () => {
    expect(verifyAdminSecret('my-secret', 'my-secret')).toBe(true);
  });

  test('rejects wrong secret', () => {
    expect(verifyAdminSecret('wrong', 'my-secret')).toBe(false);
  });

  test('rejects empty secret', () => {
    expect(verifyAdminSecret('', 'my-secret')).toBe(false);
  });

  test('rejects null secret', () => {
    expect(verifyAdminSecret(null, 'my-secret')).toBe(false);
  });

  test('rejects when server secret not configured', () => {
    expect(verifyAdminSecret('anything', null)).toBe(false);
  });
});

describe('Beta invite: code validation', () => {
  test('recognizes BETA- prefixed codes', () => {
    expect(isBetaCode('BETA-B6F22')).toBe(true);
    expect(isBetaCode('BETA-ABCDEF')).toBe(true);
  });

  test('rejects non-beta codes', () => {
    expect(isBetaCode('REF-ABCDEF')).toBe(false);
    expect(isBetaCode('GIFT-ABCDEF')).toBe(false);
    expect(isBetaCode('')).toBe(false);
    expect(isBetaCode(null)).toBe(false);
    expect(isBetaCode(undefined)).toBe(false);
  });
});

describe('Beta invite: DB tracking', () => {
  let db;
  beforeEach(() => {
    db = getTestDb();
    db.prepare(`
      INSERT INTO subscribers (id, email, active, confirmed_at)
      VALUES (?, ?, 1, datetime('now'))
    `).run(uuidv4(), 'beta@example.com');
  });
  afterEach(() => { if (db) db.close(); });

  test('records beta invite code on subscriber', () => {
    recordBetaInvite(db, 'beta@example.com', 'BETA-B6F22');
    const sub = db.prepare('SELECT beta_invite FROM subscribers WHERE email = ?').get('beta@example.com');
    expect(sub.beta_invite).toBe('BETA-B6F22');
  });

  test('can query all beta subscribers', () => {
    recordBetaInvite(db, 'beta@example.com', 'BETA-B6F22');
    const betas = getBetaSubscribers(db);
    expect(betas.length).toBe(1);
    expect(betas[0].email).toBe('beta@example.com');
    expect(betas[0].beta_invite).toBe('BETA-B6F22');
  });

  test('non-beta subscriber not included in beta query', () => {
    // don't call recordBetaInvite
    const betas = getBetaSubscribers(db);
    expect(betas.length).toBe(0);
  });

  test('can overwrite beta invite code', () => {
    recordBetaInvite(db, 'beta@example.com', 'BETA-FIRST');
    recordBetaInvite(db, 'beta@example.com', 'BETA-SECOND');
    const sub = db.prepare('SELECT beta_invite FROM subscribers WHERE email = ?').get('beta@example.com');
    expect(sub.beta_invite).toBe('BETA-SECOND');
  });
});

describe('Gift subscription: DB schema', () => {
  let db;
  beforeEach(() => { db = getTestDb(); });
  afterEach(() => { if (db) db.close(); });

  test('gifts table exists with required columns', () => {
    const info = db.prepare("PRAGMA table_info(gifts)").all();
    const cols = info.map(c => c.name);
    expect(cols).toContain('id');
    expect(cols).toContain('gifter_id');
    expect(cols).toContain('recipient_email');
    expect(cols).toContain('code');
    expect(cols).toContain('sent_at');
  });

  test('can insert and retrieve a gift record', () => {
    const gifter = uuidv4();
    const code = `GIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    db.prepare(`
      INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), gifter, 'recipient@example.com', code);

    const gift = db.prepare('SELECT * FROM gifts WHERE code = ?').get(code);
    expect(gift.recipient_email).toBe('recipient@example.com');
    expect(gift.gifter_id).toBe(gifter);
  });

  test('gift code is unique', () => {
    const code = 'GIFT-DUPLICATE';
    db.prepare(`INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at) VALUES (?, ?, ?, ?, datetime('now'))`)
      .run(uuidv4(), uuidv4(), 'a@example.com', code);

    expect(() => {
      db.prepare(`INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at) VALUES (?, ?, ?, ?, datetime('now'))`)
        .run(uuidv4(), uuidv4(), 'b@example.com', code);
    }).toThrow();
  });
});
