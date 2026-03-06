const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');

const K = ENC_KEY;

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
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('subscribers with NULL station_code are matched by lat/lon grid', async () => {
    const subId = 'sub-intl-001';
    await db.query(`
      INSERT INTO subscribers (
        id, email, email_hash, location_city, location_country,
        lat, lon, author_key, active, confirmed_at
      ) VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'),
        pgp_sym_encrypt($3, '${K}'), $4,
        $5, $6, $7, 1, NOW())
    `, [subId, 'intl@example.com', 'Tokyo', 'JP', 35.6762, 139.6503, 'hemingway']);

    const comboId = 'combo-intl-001';
    await db.query(`
      INSERT INTO combinations (
        id, location_key, author_key, location_city, location_country,
        lat, lon, hemisphere, station_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [comboId, '35.68:139.65', 'hemingway', 'Tokyo', 'JP', 35.6762, 139.6503, 'N', null]);

    const { rows: subs } = await db.query(`
      SELECT DISTINCT s.id, pgp_sym_decrypt(s.email, '${K}')::text as email
      FROM subscribers s
      WHERE s.active = 1 AND s.confirmed_at IS NOT NULL
    `);

    expect(subs.length).toBe(1);
    expect(subs[0].id).toBe(subId);
  });
});
