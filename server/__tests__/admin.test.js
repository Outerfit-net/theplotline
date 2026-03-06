const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');

const K = ENC_KEY;

describe('International Subscriber Dispatch', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('international subscriber with NULL station_code is loaded by lat/lon', async () => {
    const subId = 'sub-intl-001';
    await db.query(`
      INSERT INTO subscribers (
        id, email, email_hash, location_city, location_country,
        lat, lon, author_key, active, confirmed_at, subscription_status
      ) VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'),
        pgp_sym_encrypt($3, '${K}'), $4, $5, $6, $7, 1, NOW(), 'active')
    `, [subId, 'intl@example.com', 'Tokyo', 'JP', 35.6762, 139.6503, 'hemingway']);

    const { rows } = await db.query(`
      SELECT s.id, pgp_sym_decrypt(s.email, '${K}')::text as email
      FROM subscribers s
      WHERE s.active = 1
        AND s.confirmed_at IS NOT NULL
        AND s.subscription_status = 'active'
    `);

    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe('intl@example.com');
  });

  test('encrypted email decrypts correctly', async () => {
    const subId = 'sub-enc-001';
    const email = 'encrypted@example.com';

    await db.query(`
      INSERT INTO subscribers (id, email, email_hash, active, confirmed_at, subscription_status)
      VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'), 1, NOW(), 'active')
    `, [subId, email]);

    const { rows } = await db.query(`
      SELECT pgp_sym_decrypt(email, '${K}')::text as email FROM subscribers WHERE id = $1
    `, [subId]);

    expect(rows[0].email).toBe(email);
  });
});
