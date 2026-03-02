import { test, expect } from '@jest/globals';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '..', 'data', 'test-plotlines.db');

function getTestDb() {
  // Use test database
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  
  // Copy main DB for testing
  const mainDb = path.join(__dirname, '..', 'data', 'plotlines.db');
  if (fs.existsSync(mainDb)) {
    fs.copyFileSync(mainDb, TEST_DB);
  }
  
  return new Database(TEST_DB);
}

function cleanupTestDb() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
}

describe('Feature 1: Subscription Management', () => {
  let db;

  beforeEach(() => {
    db = getTestDb();
  });

  afterEach(() => {
    if (db) db.close();
    cleanupTestDb();
  });

  test('GET /api/subscription/status - can query subscriber by email and token', () => {
    // Create a test subscriber
    const stmt = db.prepare(`
      INSERT INTO subscribers (id, email, unsubscribe_token, plan, subscription_status, subscription_end_date, stripe_subscription_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const testEmail = 'test-' + Date.now() + '@example.com';
    const testToken = 'test-token-' + Date.now();
    const testSubId = 'sub-test-' + Date.now();
    
    stmt.run(testSubId, testEmail, testToken, 'monthly', 'active', '2025-04-01', 'stripe_sub_123');
    
    // Verify we can query it back
    const checkStmt = db.prepare(`
      SELECT id, email, plan, subscription_status, subscription_end_date 
      FROM subscribers 
      WHERE email = ? AND unsubscribe_token = ?
    `);
    
    const result = checkStmt.get(testEmail, testToken);
    expect(result).toBeDefined();
    expect(result.plan).toBe('monthly');
    expect(result.subscription_status).toBe('active');
  });

  test('POST /api/subscription/cancel - can update subscription status to canceled', () => {
    // Create a test subscriber
    const insertStmt = db.prepare(`
      INSERT INTO subscribers (id, email, unsubscribe_token, plan, subscription_status, subscription_end_date, stripe_subscription_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const testEmail = 'cancel-test-' + Date.now() + '@example.com';
    const testToken = 'cancel-token-' + Date.now();
    const testSubId = 'sub-cancel-' + Date.now();
    
    insertStmt.run(testSubId, testEmail, testToken, 'monthly', 'active', '2025-04-01', 'stripe_sub_456');
    
    // Simulate cancel by updating status
    const updateStmt = db.prepare('UPDATE subscribers SET subscription_status = ? WHERE id = ?');
    const result = updateStmt.run('canceled', testSubId);
    
    expect(result.changes).toBe(1);
    
    // Verify it was updated
    const checkStmt = db.prepare('SELECT subscription_status FROM subscribers WHERE id = ?');
    const updated = checkStmt.get(testSubId);
    expect(updated.subscription_status).toBe('canceled');
  });

  test('Database: referrals table exists', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='referrals'").all();
    expect(tables.length).toBe(1);
  });

  test('Database: can insert and query referrals', () => {
    const stmt = db.prepare(`
      INSERT INTO referrals (id, referrer_id, code, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    
    const refId = 'ref-test-' + Date.now();
    const referrerId = 'user-' + Date.now();
    const code = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const result = stmt.run(refId, referrerId, code);
    expect(result.changes).toBe(1);
    
    // Query it back
    const checkStmt = db.prepare('SELECT * FROM referrals WHERE id = ?');
    const row = checkStmt.get(refId);
    expect(row).toBeDefined();
    expect(row.code).toBe(code);
  });

  test('Database: gifts table exists', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gifts'").all();
    expect(tables.length).toBe(1);
  });

  test('Database: can insert and query gifts', () => {
    const stmt = db.prepare(`
      INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    
    const giftId = 'gift-test-' + Date.now();
    const gifterId = 'user-' + Date.now();
    const code = 'GIFT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const result = stmt.run(giftId, gifterId, 'recipient@example.com', code);
    expect(result.changes).toBe(1);
    
    // Query it back
    const checkStmt = db.prepare('SELECT * FROM gifts WHERE id = ?');
    const row = checkStmt.get(giftId);
    expect(row).toBeDefined();
    expect(row.code).toBe(code);
  });

  test('Database: referral_code column exists on subscribers', () => {
    const columns = db.prepare("PRAGMA table_info(subscribers)").all();
    const referralCodeCol = columns.find(c => c.name === 'referral_code');
    expect(referralCodeCol).toBeDefined();
  });
});
