/**
 * Tests for the master dispatch query — verifies correct grain,
 * JSON_AGG structure, and active/confirmed/status filtering.
 */

const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');
const { v4: uuidv4 } = require('uuid');

const K = ENC_KEY;

const MASTER_QUERY = `
SELECT
    c.station_code,
    pgp_sym_decrypt(s.zipcode, $1)::text AS zipcode,
    c.author_key,
    c.climate_zone_id,
    c.hemisphere,
    c.lat,
    c.lon,
    COUNT(s.id) AS subscriber_count,
    JSON_AGG(JSON_BUILD_OBJECT(
        'id', s.id,
        'email', pgp_sym_decrypt(s.email, $1)::text,
        'unsubscribe_token', s.unsubscribe_token
    ) ORDER BY s.created_at) AS subscribers
FROM combinations c
JOIN subscribers s
    ON s.station_code = c.station_code
    AND s.author_key = c.author_key
    AND s.active = 1
    AND s.confirmed_at IS NOT NULL
    AND s.subscription_status = 'active'
WHERE c.station_code IS NOT NULL
GROUP BY
    c.station_code,
    pgp_sym_decrypt(s.zipcode, $1)::text,
    c.author_key,
    c.climate_zone_id,
    c.hemisphere,
    c.lat,
    c.lon
ORDER BY c.station_code, zipcode, c.author_key
`;

// ── Helpers ──────────────────────────────────────────────────────────────

async function insertClimateZone(db, id, name = id) {
  await db.query(`
    INSERT INTO climate_zones (id, name) VALUES ($1, $2)
    ON CONFLICT (id) DO NOTHING
  `, [id, name]);
}

async function insertCombination(db, overrides = {}) {
  const id = overrides.id || uuidv4();
  await db.query(`
    INSERT INTO combinations (
      id, location_key, author_key, climate_zone_id,
      lat, lon, hemisphere, station_code
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id,
    overrides.location_key || overrides.station_code || 'BOU',
    overrides.author_key || 'hemingway',
    overrides.climate_zone_id || null,
    overrides.lat || 40.0,
    overrides.lon || -105.0,
    overrides.hemisphere || 'N',
    overrides.station_code || 'BOU',
  ]);
  return id;
}

async function insertSubscriber(db, overrides = {}) {
  const id = overrides.id || uuidv4();
  const email = overrides.email || `test-mq-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const zipcode = overrides.zipcode || '80301';

  await db.query(`
    INSERT INTO subscribers (
      id, email, email_hash, zipcode,
      station_code, author_key, active, confirmed_at,
      subscription_status, unsubscribe_token, climate_zone_id, hemisphere,
      created_at
    ) VALUES (
      $1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'),
      pgp_sym_encrypt($3, '${K}'),
      $4, $5, $6, $7, $8, $9, $10, $11,
      $12
    )
  `, [
    id, email, zipcode,
    overrides.station_code || 'BOU',
    overrides.author_key || 'hemingway',
    'active' in overrides ? overrides.active : 1,
    'confirmed_at' in overrides ? overrides.confirmed_at : new Date(),
    overrides.subscription_status || 'active',
    overrides.unsubscribe_token || uuidv4(),
    overrides.climate_zone_id || null,
    overrides.hemisphere || 'N',
    overrides.created_at || new Date(),
  ]);

  return { id, email, zipcode };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Master Dispatch Query', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  // ── 1. Single combo per (station, zipcode, author) ─────────────────────
  test('different zipcodes produce separate rows for same station/author', async () => {
    await insertCombination(db, { station_code: 'BOU', author_key: 'hemingway' });

    await insertSubscriber(db, { station_code: 'BOU', author_key: 'hemingway', zipcode: '80301' });
    await insertSubscriber(db, { station_code: 'BOU', author_key: 'hemingway', zipcode: '80302' });

    const { rows } = await db.query(MASTER_QUERY, [K]);
    expect(rows.length).toBe(2);
    const zips = rows.map(r => r.zipcode).sort();
    expect(zips).toEqual(['80301', '80302']);
  });

  // ── 2. JSON_AGG subscribers field ──────────────────────────────────────
  test('subscribers array has correct structure for combo with 2 subscribers', async () => {
    await insertCombination(db, { station_code: 'BOU', author_key: 'hemingway' });

    const sub1 = await insertSubscriber(db, {
      station_code: 'BOU', author_key: 'hemingway', zipcode: '80301',
      created_at: new Date('2026-01-01'),
    });
    const sub2 = await insertSubscriber(db, {
      station_code: 'BOU', author_key: 'hemingway', zipcode: '80301',
      created_at: new Date('2026-01-02'),
    });

    const { rows } = await db.query(MASTER_QUERY, [K]);
    expect(rows.length).toBe(1);

    const subs = rows[0].subscribers;
    expect(subs).toHaveLength(2);
    expect(subs[0]).toHaveProperty('id', sub1.id);
    expect(subs[0]).toHaveProperty('email', sub1.email);
    expect(subs[0]).toHaveProperty('unsubscribe_token', expect.any(String));
    expect(subs[1]).toHaveProperty('id', sub2.id);
  });

  // ── 3. climate_zone_id in result ───────────────────────────────────────
  test('climate_zone_id appears in master query result', async () => {
    await insertClimateZone(db, 'high_plains', 'High Plains');
    await insertCombination(db, { station_code: 'BOU', climate_zone_id: 'high_plains' });
    await insertSubscriber(db, { station_code: 'BOU', climate_zone_id: 'high_plains' });

    const { rows } = await db.query(MASTER_QUERY, [K]);
    expect(rows.length).toBe(1);
    expect(rows[0].climate_zone_id).toBe('high_plains');
  });

  // ── 4. hemisphere in result ────────────────────────────────────────────
  test('hemisphere=S appears in master query result', async () => {
    await insertCombination(db, { station_code: 'SYD', hemisphere: 'S', lat: -33.87, lon: 151.21 });
    await insertSubscriber(db, { station_code: 'SYD', hemisphere: 'S' });

    const { rows } = await db.query(MASTER_QUERY, [K]);
    expect(rows.length).toBe(1);
    expect(rows[0].hemisphere).toBe('S');
  });

  // ── 5. Only active+confirmed+active-status subscribers ─────────────────
  test('master query returns only active, confirmed, active-status subscribers', async () => {
    await insertCombination(db, { station_code: 'BOU', author_key: 'hemingway' });

    // Active + confirmed + subscription_status=active → should appear
    const good = await insertSubscriber(db, {
      station_code: 'BOU', author_key: 'hemingway',
      active: 1, confirmed_at: new Date(), subscription_status: 'active',
    });

    // Unconfirmed → should NOT appear
    await insertSubscriber(db, {
      station_code: 'BOU', author_key: 'hemingway',
      active: 1, confirmed_at: null, subscription_status: 'active',
    });

    // Cancelled (active=0) → should NOT appear
    await insertSubscriber(db, {
      station_code: 'BOU', author_key: 'hemingway',
      active: 0, confirmed_at: new Date(), subscription_status: 'active',
    });

    const { rows } = await db.query(MASTER_QUERY, [K]);
    expect(rows.length).toBe(1);

    const subs = rows[0].subscribers;
    expect(subs).toHaveLength(1);
    expect(subs[0].id).toBe(good.id);
  });
});
