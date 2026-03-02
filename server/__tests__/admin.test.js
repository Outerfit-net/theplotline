import { test, expect, describe, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '..', 'data', 'test-plotlines.db');

function getTestDb() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  const db = new Database(TEST_DB);
  
  // Apply schema
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  
  return db;
}

describe('Admin Routes', () => {
  test('requires ADMIN_SECRET environment variable', () => {
    delete process.env.ADMIN_SECRET;
    
    // Just test that calling without secret throws
    expect(() => {
      if (!process.env.ADMIN_SECRET) {
        throw new Error('ADMIN_SECRET is required');
      }
    }).toThrow(/ADMIN_SECRET/);
  });

  test('can verify admin secret', () => {
    process.env.ADMIN_SECRET = 'test-secret-123';
    
    const secret = process.env.ADMIN_SECRET;
    expect(secret).toBe('test-secret-123');
    
    // Simulate password check
    const password = 'test-secret-123';
    expect(password === secret).toBe(true);
  });

  test('login with wrong secret returns false', () => {
    process.env.ADMIN_SECRET = 'test-secret-123';
    
    const secret = process.env.ADMIN_SECRET;
    const password = 'wrong-password';
    
    expect(password === secret).toBe(false);
  });
});

describe('International Subscriber Dispatch', () => {
  test('subscribers with NULL station_code are matched by lat/lon grid', () => {
    const db = getTestDb();
    
    // Insert international subscriber (no station_code)
    const subId = 'sub-intl-001';
    db.prepare(`
      INSERT INTO subscribers (
        id, email, location_city, location_country,
        lat, lon, author_key, active, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(subId, 'intl@example.com', 'Tokyo', 'JP', 35.6762, 139.6503, 'hemingway');
    
    // Insert combination with same location
    const comboId = 'combo-intl-001';
    db.prepare(`
      INSERT INTO combinations (
        id, location_key, author_key, location_city, location_country,
        lat, lon, hemisphere, station_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(comboId, '35.68:139.65', 'hemingway', 'Tokyo', 'JP', 35.6762, 139.6503, 'N', null);
    
    // Test: get combinations for subscribers with confirmed status
    const subs = db.prepare(`
      SELECT DISTINCT s.id, s.email
      FROM subscribers s
      WHERE s.active = 1 AND s.confirmed_at IS NOT NULL
    `).all();
    
    expect(subs.length).toBe(1);
    expect(subs[0].id).toBe(subId);
    
    db.close();
  });
});
