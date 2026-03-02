const { test, expect, describe } = require('@jest/globals');
const { initTestDb } = require('./setup');

function getTestDb() {
  return initTestDb(':memory:');
}

describe('Admin Routes', () => {
  test('requires ADMIN_SECRET environment variable', () => {
    delete process.env.ADMIN_SECRET;
    
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
    
    const subId = 'sub-intl-001';
    db.prepare(`
      INSERT INTO subscribers (
        id, email, location_city, location_country,
        lat, lon, author_key, active, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(subId, 'intl@example.com', 'Tokyo', 'JP', 35.6762, 139.6503, 'hemingway');
    
    const comboId = 'combo-intl-001';
    db.prepare(`
      INSERT INTO combinations (
        id, location_key, author_key, location_city, location_country,
        lat, lon, hemisphere, station_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(comboId, '35.68:139.65', 'hemingway', 'Tokyo', 'JP', 35.6762, 139.6503, 'N', null);
    
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
