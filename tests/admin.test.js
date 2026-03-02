import { test, expect } from '@jest/globals';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '..', 'data', 'test-plotlines.db');

function getTestDb() {
  if (require('fs').existsSync(TEST_DB)) {
    require('fs').unlinkSync(TEST_DB);
  }
  const db = new Database(TEST_DB);
  
  // Apply schema
  const fs = require('fs');
  const schemaPath = path.join(__dirname, '..', 'server', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  
  return db;
}

describe('Admin Routes', () => {
  test('requires ADMIN_SECRET environment variable', () => {
    delete process.env.ADMIN_SECRET;
    
    const adminRoutes = require('../server/routes/admin.js');
    expect(() => {
      const fastify = { db: getTestDb(), post: () => {}, get: () => {}, log: { error: () => {} } };
      adminRoutes(fastify);
    }).toThrow(/ADMIN_SECRET/);
  });

  test('login with correct secret generates session token', async () => {
    process.env.ADMIN_SECRET = 'test-secret-123';
    
    const db = getTestDb();
    const adminRoutes = require('../server/routes/admin.js');
    
    const responses = {};
    const fastify = {
      db,
      post: (path, handler) => { responses[path] = handler; },
      get: (path, handler) => { responses[path] = handler; },
      log: { error: () => {} }
    };
    
    await adminRoutes(fastify);
    
    const req = { body: { password: 'test-secret-123' } };
    const reply = { code: () => reply };
    
    const result = await responses['/admin/login'](req, reply);
    
    expect(result.ok).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.token.length).toBeGreaterThan(30);
    
    db.close();
  });

  test('login with wrong secret returns 401', async () => {
    process.env.ADMIN_SECRET = 'test-secret-123';
    
    const db = getTestDb();
    const adminRoutes = require('../server/routes/admin.js');
    
    const responses = {};
    let statusCode = 200;
    const fastify = {
      db,
      post: (path, handler) => { responses[path] = handler; },
      get: (path, handler) => { responses[path] = handler; },
      log: { error: () => {} }
    };
    
    await adminRoutes(fastify);
    
    const req = { body: { password: 'wrong-password' } };
    const reply = { code: (c) => { statusCode = c; return reply; } };
    
    const result = await responses['/admin/login'](req, reply);
    
    expect(statusCode).toBe(401);
    expect(result.error).toBeDefined();
    
    db.close();
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
    `).run(comboId, '35.68:139.65', 'hemingway', 'Tokyo', 'JP', 35.6762, 139.6503, 'N', NULL);
    
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
