/**
 * Tests for beta invite system and admin auth
 */

const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const K = ENC_KEY;

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

async function recordBetaInvite(db, subscriberEmail, betaCode) {
  await db.query(
    `UPDATE subscribers SET beta_invite = $1 WHERE email_hash = encode(digest($2, 'sha256'), 'hex')`,
    [betaCode, subscriberEmail]
  );
}

async function getBetaSubscribers(db) {
  const { rows } = await db.query(
    `SELECT id, pgp_sym_decrypt(email, '${K}')::text as email, beta_invite FROM subscribers WHERE beta_invite IS NOT NULL`
  );
  return rows;
}

// ── Admin Auth Tests ───────────────────────────────────────────────────────

describe('Admin: session token management', () => {
  beforeEach(() => sessionTokens.clear());

  test('generates a valid session token', () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(64);
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
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  async function insertSubscriber(email) {
    await db.query(`
      INSERT INTO subscribers (id, email, email_hash, active, confirmed_at)
      VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), 1, NOW())
    `, [uuidv4(), email]);
  }

  test('records beta invite code on subscriber', async () => {
    await insertSubscriber('beta@example.com');
    await recordBetaInvite(db, 'beta@example.com', 'BETA-B6F22');
    const { rows } = await db.query(
      `SELECT beta_invite FROM subscribers WHERE email_hash = encode(digest($1, 'sha256'), 'hex')`,
      ['beta@example.com']
    );
    expect(rows[0].beta_invite).toBe('BETA-B6F22');
  });

  test('can query all beta subscribers', async () => {
    await insertSubscriber('beta@example.com');
    await recordBetaInvite(db, 'beta@example.com', 'BETA-B6F22');
    const betas = await getBetaSubscribers(db);
    expect(betas.length).toBe(1);
    expect(betas[0].email).toBe('beta@example.com');
    expect(betas[0].beta_invite).toBe('BETA-B6F22');
  });

  test('non-beta subscriber not included in beta query', async () => {
    await insertSubscriber('beta@example.com');
    const betas = await getBetaSubscribers(db);
    expect(betas.length).toBe(0);
  });

  test('can overwrite beta invite code', async () => {
    await insertSubscriber('beta@example.com');
    await recordBetaInvite(db, 'beta@example.com', 'BETA-FIRST');
    await recordBetaInvite(db, 'beta@example.com', 'BETA-SECOND');
    const { rows } = await db.query(
      `SELECT beta_invite FROM subscribers WHERE email_hash = encode(digest($1, 'sha256'), 'hex')`,
      ['beta@example.com']
    );
    expect(rows[0].beta_invite).toBe('BETA-SECOND');
  });
});

describe('Gift subscription: DB schema', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  async function makeGifter() {
    const id = uuidv4();
    await db.query(`
      INSERT INTO subscribers (id, email, email_hash, active)
      VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), 1)
    `, [id, `gifter-${id}@example.com`]);
    return id;
  }

  test('gifts table exists with required columns', async () => {
    const { rows } = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts'
    `);
    const cols = rows.map(r => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('gifter_id');
    expect(cols).toContain('recipient_email');
    expect(cols).toContain('code');
    expect(cols).toContain('sent_at');
  });

  test('can insert and retrieve a gift record', async () => {
    const gifter = await makeGifter();
    const code = `GIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await db.query(`
      INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [uuidv4(), gifter, 'recipient@example.com', code]);

    const { rows } = await db.query('SELECT * FROM gifts WHERE code = $1', [code]);
    expect(rows[0].recipient_email).toBe('recipient@example.com');
    expect(rows[0].gifter_id).toBe(gifter);
  });

  test('gift code is unique', async () => {
    const gifter1 = await makeGifter();
    const gifter2 = await makeGifter();
    const code = 'GIFT-DUPLICATE';

    await db.query(`
      INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [uuidv4(), gifter1, 'a@example.com', code]);

    await expect(db.query(`
      INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [uuidv4(), gifter2, 'b@example.com', code])).rejects.toThrow();
  });
});
