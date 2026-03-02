const { test, expect, describe, beforeEach, afterEach } = require('@jest/globals');
const { initTestDb } = require('./setup');

function getTestDb() {
  return initTestDb(':memory:');
}

describe('Complete Feature Implementation', () => {
  let db;

  beforeEach(() => {
    db = getTestDb();
  });

  afterEach(() => {
    if (db) db.close();
  });

  describe('Feature 1: Cancel Subscription', () => {
    test('can query subscription status by email+token', () => {
      const stmt = db.prepare(`
        INSERT INTO subscribers (id, email, unsubscribe_token, plan, subscription_status, subscription_end_date, stripe_subscription_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const testEmail = 'status-' + Date.now() + '@test.com';
      const testToken = 'token-' + Date.now();
      const subId = 'sub-' + Date.now();
      
      stmt.run(subId, testEmail, testToken, 'monthly', 'active', '2025-04-15', 'stripe_sub_x');
      
      const check = db.prepare(`
        SELECT plan, subscription_status, subscription_end_date FROM subscribers 
        WHERE email = ? AND unsubscribe_token = ?
      `);
      
      const result = check.get(testEmail, testToken);
      expect(result.plan).toBe('monthly');
      expect(result.subscription_status).toBe('active');
      expect(result.subscription_end_date).toBe('2025-04-15');
    });

    test('can mark subscription as canceled', () => {
      const subId = 'sub-cancel-' + Date.now();
      const stmt = db.prepare(`
        INSERT INTO subscribers (id, email, unsubscribe_token, plan, subscription_status, stripe_subscription_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(subId, 'cancel@test.com', 'token-x', 'monthly', 'active', 'stripe_sub_y');
      
      const update = db.prepare('UPDATE subscribers SET subscription_status = ? WHERE id = ?');
      const result = update.run('canceled', subId);
      expect(result.changes).toBe(1);
      
      const check = db.prepare('SELECT subscription_status FROM subscribers WHERE id = ?');
      expect(check.get(subId).subscription_status).toBe('canceled');
    });
  });

  describe('Feature 2: Referral System', () => {
    test('referrals table exists and can insert referral code', () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='referrals'").all();
      expect(tables.length).toBe(1);
      
      const stmt = db.prepare(`
        INSERT INTO referrals (id, referrer_id, code, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      
      const refId = 'ref-' + Date.now();
      const userId = 'user-' + Date.now();
      const code = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const result = stmt.run(refId, userId, code);
      expect(result.changes).toBe(1);
      
      const check = db.prepare('SELECT code FROM referrals WHERE id = ?');
      expect(check.get(refId).code).toBe(code);
    });

    test('can mark referral as redeemed with reward_applied_at', () => {
      const refId = 'ref-' + Date.now();
      const userId = 'user-' + Date.now();
      const code = 'REF-ABC123';
      
      const insert = db.prepare(`
        INSERT INTO referrals (id, referrer_id, code, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);
      insert.run(refId, userId, code);
      
      const update = db.prepare(`
        UPDATE referrals SET redeemed_at = datetime('now'), reward_applied_at = datetime('now')
        WHERE id = ?
      `);
      update.run(refId);
      
      const check = db.prepare('SELECT redeemed_at, reward_applied_at FROM referrals WHERE id = ?');
      const row = check.get(refId);
      expect(row.redeemed_at).toBeTruthy();
      expect(row.reward_applied_at).toBeTruthy();
    });

    test('subscribers can have referral_code stored', () => {
      const subId = 'sub-ref-' + Date.now();
      const stmt = db.prepare(`
        INSERT INTO subscribers (id, email, referral_code)
        VALUES (?, ?, ?)
      `);
      
      stmt.run(subId, 'ref-subscriber@test.com', 'REF-XYZ999');
      
      const check = db.prepare('SELECT referral_code FROM subscribers WHERE id = ?');
      expect(check.get(subId).referral_code).toBe('REF-XYZ999');
    });
  });

  describe('Feature 3: Gift Subscription', () => {
    test('gifts table exists and can insert gift', () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gifts'").all();
      expect(tables.length).toBe(1);
      
      const stmt = db.prepare(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      const giftId = 'gift-' + Date.now();
      const gifterId = 'user-' + Date.now();
      const code = 'GIFT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const result = stmt.run(giftId, gifterId, 'recipient@test.com', code);
      expect(result.changes).toBe(1);
      
      const check = db.prepare('SELECT code, recipient_email FROM gifts WHERE id = ?');
      const row = check.get(giftId);
      expect(row.code).toBe(code);
      expect(row.recipient_email).toBe('recipient@test.com');
    });

    test('can query gifts by gifter_id', () => {
      const gifterId = 'gifter-' + Date.now();
      
      const insert = db.prepare(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      insert.run('gift1-' + Date.now(), gifterId, 'alice@test.com', 'GIFT-111');
      insert.run('gift2-' + Date.now(), gifterId, 'bob@test.com', 'GIFT-222');
      
      const check = db.prepare('SELECT COUNT(*) as cnt FROM gifts WHERE gifter_id = ?');
      expect(check.get(gifterId).cnt).toBe(2);
    });

    test('can query gifts by recipient email', () => {
      const recipientEmail = 'lucky@test.com';
      
      const insert = db.prepare(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      insert.run('gift-' + Date.now(), 'user1', recipientEmail, 'GIFT-AAA');
      
      const check = db.prepare('SELECT COUNT(*) as cnt FROM gifts WHERE recipient_email = ?');
      expect(check.get(recipientEmail).cnt).toBe(1);
    });
  });

  describe('Database Integrity', () => {
    test('all required tables exist', () => {
      const tables = ['subscribers', 'referrals', 'gifts'].map(name =>
        db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name)
      );
      
      expect(tables.filter(t => t).length).toBe(3);
    });

    test('referrals table has correct indexes', () => {
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='referrals'"
      ).all();
      
      const hasCodeIndex = indexes.some(i => i.name.includes('code'));
      expect(hasCodeIndex).toBe(true);
    });

    test('gifts table has correct indexes', () => {
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='gifts'"
      ).all();
      
      const hasCodeIndex = indexes.some(i => i.name.includes('code'));
      expect(hasCodeIndex).toBe(true);
    });
  });
});
