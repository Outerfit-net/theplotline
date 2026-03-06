const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');
const { v4: uuidv4 } = require('uuid');

const K = ENC_KEY;

describe('Feature 1: Subscription Management', () => {
  let db;

  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('GET /api/subscription/status - can query subscriber by email and token', async () => {
    const testEmail = 'test-' + Date.now() + '@example.com';
    const testToken = 'test-token-' + Date.now();
    const testSubId = 'sub-test-' + Date.now();

    await db.query(`
      INSERT INTO subscribers (id, email, email_hash, unsubscribe_token, plan, subscription_status, subscription_end_date, stripe_subscription_id)
      VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), $3, $4, $5, $6, $7)
    `, [testSubId, testEmail, testToken, 'monthly', 'active', '2025-04-01', 'stripe_sub_123']);

    const { rows } = await db.query(`
      SELECT id, pgp_sym_decrypt(email, '${K}')::text as email, plan, subscription_status, subscription_end_date
      FROM subscribers
      WHERE email_hash = encode(digest($1, 'sha256'), 'hex') AND unsubscribe_token = $2
    `, [testEmail, testToken]);

    expect(rows[0]).toBeDefined();
    expect(rows[0].plan).toBe('monthly');
    expect(rows[0].subscription_status).toBe('active');
  });

  test('POST /api/subscription/cancel - can update subscription status to canceled', async () => {
    const testEmail = 'cancel-test-' + Date.now() + '@example.com';
    const testToken = 'cancel-token-' + Date.now();
    const testSubId = 'sub-cancel-' + Date.now();

    await db.query(`
      INSERT INTO subscribers (id, email, email_hash, unsubscribe_token, plan, subscription_status, subscription_end_date, stripe_subscription_id)
      VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), $3, $4, $5, $6, $7)
    `, [testSubId, testEmail, testToken, 'monthly', 'active', '2025-04-01', 'stripe_sub_456']);

    const result = await db.query('UPDATE subscribers SET subscription_status = $1 WHERE id = $2', ['canceled', testSubId]);
    expect(result.rowCount).toBe(1);

    const { rows } = await db.query('SELECT subscription_status FROM subscribers WHERE id = $1', [testSubId]);
    expect(rows[0].subscription_status).toBe('canceled');
  });

  test('Database: referrals table exists', async () => {
    const { rows } = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'referrals'
    `);
    expect(rows.length).toBe(1);
  });

  test('Database: can insert and query referrals', async () => {
    const referrerId = 'user-' + Date.now();
    await db.query(`
      INSERT INTO subscribers (id, email, email_hash)
      VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'))
    `, [referrerId, `ref-${referrerId}@example.com`]);

    const refId = 'ref-test-' + Date.now();
    const code = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const result = await db.query(`
      INSERT INTO referrals (id, referrer_id, code, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [refId, referrerId, code]);
    expect(result.rowCount).toBe(1);

    const { rows } = await db.query('SELECT * FROM referrals WHERE id = $1', [refId]);
    expect(rows[0]).toBeDefined();
    expect(rows[0].code).toBe(code);
  });

  test('Database: gifts table exists', async () => {
    const { rows } = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'gifts'
    `);
    expect(rows.length).toBe(1);
  });

  test('Database: can insert and query gifts', async () => {
    const gifterId = 'user-' + Date.now();
    await db.query(`
      INSERT INTO subscribers (id, email, email_hash)
      VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'))
    `, [gifterId, `gifter-${gifterId}@example.com`]);

    const giftId = 'gift-test-' + Date.now();
    const code = 'GIFT-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const result = await db.query(`
      INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [giftId, gifterId, 'recipient@example.com', code]);
    expect(result.rowCount).toBe(1);

    const { rows } = await db.query('SELECT * FROM gifts WHERE id = $1', [giftId]);
    expect(rows[0]).toBeDefined();
    expect(rows[0].code).toBe(code);
  });

  test('Database: referral_code column exists on subscribers', async () => {
    const { rows } = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscribers' AND column_name = 'referral_code'
    `);
    expect(rows.length).toBe(1);
  });
});
