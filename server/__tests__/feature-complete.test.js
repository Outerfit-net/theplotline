const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');
const { v4: uuidv4 } = require('uuid');

const K = ENC_KEY;

describe('Complete Feature Implementation', () => {
  let db;

  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  describe('Feature 1: Cancel Subscription', () => {
    test('can query subscription status by email+token', async () => {
      const testEmail = 'status-' + Date.now() + '@test.com';
      const testToken = 'token-' + Date.now();
      const subId = 'sub-' + Date.now();

      await db.query(`
        INSERT INTO subscribers (id, email, email_hash, unsubscribe_token, plan, subscription_status, subscription_end_date, stripe_subscription_id)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), $3, $4, $5, $6, $7)
      `, [subId, testEmail, testToken, 'monthly', 'active', '2025-04-15', 'stripe_sub_x']);

      const { rows } = await db.query(`
        SELECT plan, subscription_status, subscription_end_date FROM subscribers
        WHERE email_hash = encode(digest($1, 'sha256'), 'hex') AND unsubscribe_token = $2
      `, [testEmail, testToken]);

      expect(rows[0].plan).toBe('monthly');
      expect(rows[0].subscription_status).toBe('active');
      expect(rows[0].subscription_end_date).toBe('2025-04-15');
    });

    test('can mark subscription as canceled', async () => {
      const subId = 'sub-cancel-' + Date.now();
      await db.query(`
        INSERT INTO subscribers (id, email, email_hash, unsubscribe_token, plan, subscription_status, stripe_subscription_id)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), $3, $4, $5, $6)
      `, [subId, 'cancel@test.com', 'token-x', 'monthly', 'active', 'stripe_sub_y']);

      const result = await db.query('UPDATE subscribers SET subscription_status = $1 WHERE id = $2', ['canceled', subId]);
      expect(result.rowCount).toBe(1);

      const { rows } = await db.query('SELECT subscription_status FROM subscribers WHERE id = $1', [subId]);
      expect(rows[0].subscription_status).toBe('canceled');
    });
  });

  describe('Feature 2: Referral System', () => {
    test('referrals table exists and can insert referral code', async () => {
      const { rows: tables } = await db.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'referrals'
      `);
      expect(tables.length).toBe(1);

      const userId = 'user-' + Date.now();
      await db.query(`
        INSERT INTO subscribers (id, email, email_hash)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'))
      `, [userId, `ref-${userId}@test.com`]);

      const refId = 'ref-' + Date.now();
      const code = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const result = await db.query(`
        INSERT INTO referrals (id, referrer_id, code, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [refId, userId, code]);
      expect(result.rowCount).toBe(1);

      const { rows } = await db.query('SELECT code FROM referrals WHERE id = $1', [refId]);
      expect(rows[0].code).toBe(code);
    });

    test('can mark referral as redeemed with reward_applied_at', async () => {
      const userId = 'user-' + Date.now();
      await db.query(`
        INSERT INTO subscribers (id, email, email_hash)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'))
      `, [userId, `ref-${userId}@test.com`]);

      const refId = 'ref-' + Date.now();
      const code = 'REF-ABC123';

      await db.query(`
        INSERT INTO referrals (id, referrer_id, code, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [refId, userId, code]);

      await db.query(`
        UPDATE referrals SET redeemed_at = NOW(), reward_applied_at = NOW()
        WHERE id = $1
      `, [refId]);

      const { rows } = await db.query('SELECT redeemed_at, reward_applied_at FROM referrals WHERE id = $1', [refId]);
      expect(rows[0].redeemed_at).toBeTruthy();
      expect(rows[0].reward_applied_at).toBeTruthy();
    });

    test('subscribers can have referral_code stored', async () => {
      const subId = 'sub-ref-' + Date.now();
      await db.query(`
        INSERT INTO subscribers (id, email, email_hash, referral_code)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), $3)
      `, [subId, 'ref-subscriber@test.com', 'REF-XYZ999']);

      const { rows } = await db.query('SELECT referral_code FROM subscribers WHERE id = $1', [subId]);
      expect(rows[0].referral_code).toBe('REF-XYZ999');
    });
  });

  describe('Feature 3: Gift Subscription', () => {
    test('gifts table exists and can insert gift', async () => {
      const { rows: tables } = await db.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'gifts'
      `);
      expect(tables.length).toBe(1);

      const gifterId = 'user-' + Date.now();
      await db.query(`
        INSERT INTO subscribers (id, email, email_hash)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'))
      `, [gifterId, `gifter-${gifterId}@test.com`]);

      const giftId = 'gift-' + Date.now();
      const code = 'GIFT-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const result = await db.query(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [giftId, gifterId, 'recipient@test.com', code]);
      expect(result.rowCount).toBe(1);

      const { rows } = await db.query('SELECT code, recipient_email FROM gifts WHERE id = $1', [giftId]);
      expect(rows[0].code).toBe(code);
      expect(rows[0].recipient_email).toBe('recipient@test.com');
    });

    test('can query gifts by gifter_id', async () => {
      const gifterId = 'gifter-' + Date.now();
      await db.query(`
        INSERT INTO subscribers (id, email, email_hash)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'))
      `, [gifterId, `gifter-${gifterId}@test.com`]);

      await db.query(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, ['gift1-' + Date.now(), gifterId, 'alice@test.com', 'GIFT-111']);

      await db.query(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, ['gift2-' + Date.now(), gifterId, 'bob@test.com', 'GIFT-222']);

      const { rows } = await db.query('SELECT COUNT(*) as cnt FROM gifts WHERE gifter_id = $1', [gifterId]);
      expect(parseInt(rows[0].cnt)).toBe(2);
    });

    test('can query gifts by recipient email', async () => {
      const gifterId = 'user-' + Date.now();
      await db.query(`
        INSERT INTO subscribers (id, email, email_hash)
        VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'))
      `, [gifterId, `gifter-${gifterId}@test.com`]);

      const recipientEmail = 'lucky@test.com';
      await db.query(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, ['gift-' + Date.now(), gifterId, recipientEmail, 'GIFT-AAA']);

      const { rows } = await db.query('SELECT COUNT(*) as cnt FROM gifts WHERE recipient_email = $1', [recipientEmail]);
      expect(parseInt(rows[0].cnt)).toBe(1);
    });
  });

  describe('Database Integrity', () => {
    test('all required tables exist', async () => {
      const { rows } = await db.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('subscribers', 'referrals', 'gifts')
      `);
      expect(rows.length).toBe(3);
    });

    test('referrals table has correct indexes', async () => {
      const { rows } = await db.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'referrals'
      `);
      const hasCodeIndex = rows.some(i => i.indexname.includes('code'));
      expect(hasCodeIndex).toBe(true);
    });

    test('gifts table has correct indexes', async () => {
      const { rows } = await db.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'gifts'
      `);
      const hasCodeIndex = rows.some(i => i.indexname.includes('code'));
      expect(hasCodeIndex).toBe(true);
    });
  });
});
