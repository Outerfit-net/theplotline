/**
 * Webhook tests: checkout.session.completed with zipcode backfill combinations
 * Tests the 4 permutations of needsZip and needsGeo flags
 */

const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');
const { v4: uuidv4 } = require('uuid');
const { assignClimateZone } = require('../services/climate');

const K = ENC_KEY;

// ── Helpers for test setup ─────────────────────────────────────────────────

const CLIMATE_ZONES = [
  'high_plains', 'california_med', 'humid_subtropical', 'alaska_south_coastal',
  'pacific_maritime', 'florida_southern', 'florida_keys_tropical', 'desert_southwest',
  'great_plains', 'great_lakes', 'northeast', 'appalachian', 'southern_plains',
  'upper_midwest_continental'
];

async function seedClimateZones(db) {
  for (const zone of CLIMATE_ZONES) {
    await db.query(
      `INSERT INTO climate_zones (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [zone, zone]
    );
  }
}

async function makeSubscriber(db, overrides = {}) {
  const id = overrides.id || uuidv4();
  const email = overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const token = overrides.token || uuidv4();

  await db.query(`
    INSERT INTO subscribers (
      id, email, email_hash, unsubscribe_token, plan, subscription_status,
      subscription_end_date, stripe_customer_id, stripe_subscription_id,
      active, confirmed_at, zipcode, lat, lon, climate_zone_id
    ) VALUES (
      $1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'),
      $3, $4, $5, $6, $7, $8, 1, NOW(),
      CASE WHEN $9::text IS NOT NULL THEN pgp_sym_encrypt($9, '${K}') ELSE NULL END,
      $10, $11, $12
    )
  `, [
    id, email, token,
    overrides.plan || 'monthly',
    overrides.status || 'active',
    overrides.end_date || '2026-04-15',
    overrides.stripe_customer_id || `cus_${id}`,
    overrides.stripe_sub_id || `sub_${id}`,
    overrides.zipcode || null,
    overrides.lat || null,
    overrides.lon || null,
    overrides.climate_zone_id || null
  ]);

  return { id, email, token };
}

/**
 * Simulate the webhook handler's zipcode backfill logic
 * Returns { geocoded: boolean, zipcode: string, lat: number, lon: number, climateZone: string }
 */
async function handleCheckoutCompletedWithBackfill(db, session, geoCodeFn) {
  const { subscriberId, plan } = session.metadata || {};
  if (!subscriberId) return null;

  const { rows } = await db.query(
    `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode, lat, lon FROM subscribers WHERE id = $1`,
    [subscriberId]
  );
  const existing = rows[0];
  const needsZip = !existing?.zipcode;
  const needsGeo = !existing?.lat;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (plan === 'monthly' ? 30 : 7));

  // Update base subscription fields
  await db.query(`
    UPDATE subscribers
    SET stripe_customer_id = $1,
        stripe_subscription_id = $2,
        plan = $3,
        subscription_status = $4,
        subscription_end_date = $5
    WHERE id = $6
  `, [
    session.customer,
    session.subscription,
    plan,
    'active',
    endDate.toISOString().split('T')[0],
    subscriberId
  ]);

  // Backfill zipcode if present in session and subscriber needs it
  const postalCode = session.customer_details?.address?.postal_code;
  let result = {
    geocoded: false,
    zipcode: null,
    lat: null,
    lon: null,
    climateZone: null,
  };

  if (postalCode && (needsZip || needsGeo)) {
    // Always update zipcode if missing
    if (needsZip) {
      await db.query(
        `UPDATE subscribers SET zipcode = pgp_sym_encrypt($1, '${K}') WHERE id = $2`,
        [postalCode, subscriberId]
      );
      result.zipcode = postalCode;
    }

    // Attempt geocoding if coordinates are needed
    if (needsGeo) {
      try {
        const geo = geoCodeFn(postalCode);
        if (geo) {
          const zoneId = assignClimateZone(geo.lat, geo.lon, 'US');
          await db.query(
            'UPDATE subscribers SET lat = $1, lon = $2, climate_zone_id = $3 WHERE id = $4',
            [geo.lat, geo.lon, zoneId, subscriberId]
          );
          result.geocoded = true;
          result.lat = geo.lat;
          result.lon = geo.lon;
          result.climateZone = zoneId;
        }
      } catch (e) {
        console.error('[backfill] geocode error:', e.message);
      }
    }
  }

  return result;
}

/**
 * Mock geocoder for testing
 */
const mockGeocode = {
  '80304': { lat: 40.0, lon: -105.25, name: 'Boulder, CO' },
  '33139': { lat: 25.7, lon: -80.2, name: 'Miami, FL' },
  '90210': { lat: 34.09, lon: -118.41, name: 'Beverly Hills, CA' },
  '98101': { lat: 47.6, lon: -122.33, name: 'Seattle, WA' },
};

function mockGeocoder(zipcode) {
  return mockGeocode[zipcode] || null;
}

// ── Test Suite ────────────────────────────────────────────────────────────

describe('Webhook: checkout.session.completed with zipcode backfill', () => {
  let db;
  beforeAll(async () => {
    db = await getTestDb();
    await seedClimateZones(db);
  });
  beforeEach(async () => {
    // Truncate everything except climate_zones
    await db.query(`TRUNCATE gifts, referrals, deliveries, daily_runs, topic_wheel_state, mastheads, author_season_names, combinations, subscribers RESTART IDENTITY CASCADE`);
  });
  afterAll(async () => { if (db) await db.end(); });

  describe('4-way zipcode backfill combinations', () => {
    /**
     * Case 1: needsZip=true, needsGeo=true
     * Both zipcode and coordinates are missing. Should backfill both via geocoding.
     */
    test('Case 1: needsZip=true, needsGeo=true → backfill both', async () => {
      const sub = await makeSubscriber(db, {
        zipcode: null,
        lat: null,
        lon: null,
        climate_zone_id: null
      });

      const result = await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test1',
        subscription: 'sub_test1',
        customer_details: {
          address: { postal_code: '80304' }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(true);
      expect(result.zipcode).toBe('80304');
      expect(result.lat).toBeCloseTo(40.0, 1);
      expect(result.lon).toBeCloseTo(-105.25, 1);
      expect(result.climateZone).toBe('high_plains');

      const { rows } = await db.query(
        `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = $1`,
        [sub.id]
      );
      const updated = rows[0];
      expect(updated.zipcode).toBe('80304');
      expect(updated.lat).toBeCloseTo(40.0, 1);
      expect(updated.lon).toBeCloseTo(-105.25, 1);
      expect(updated.climate_zone_id).toBe('high_plains');
    });

    /**
     * Case 2: needsZip=true, needsGeo=false
     * Only zipcode is missing, but coordinates already exist. Should only fill zipcode.
     */
    test('Case 2: needsZip=true, needsGeo=false → backfill only zipcode', async () => {
      const existingLat = 34.09;
      const existingLon = -118.41;
      const existingZone = 'california_med';

      const sub = await makeSubscriber(db, {
        zipcode: null,
        lat: existingLat,
        lon: existingLon,
        climate_zone_id: existingZone
      });

      const result = await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test2',
        subscription: 'sub_test2',
        customer_details: {
          address: { postal_code: '90210' }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.zipcode).toBe('90210');
      expect(result.geocoded).toBe(false);
      expect(result.lat).toBeNull();
      expect(result.climateZone).toBeNull();

      const { rows } = await db.query(
        `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = $1`,
        [sub.id]
      );
      const updated = rows[0];
      expect(updated.zipcode).toBe('90210');
      expect(updated.lat).toBeCloseTo(existingLat, 1);
      expect(updated.lon).toBeCloseTo(existingLon, 1);
      expect(updated.climate_zone_id).toBe(existingZone);
    });

    /**
     * Case 3: needsZip=false, needsGeo=true
     * Coordinates are missing but zipcode already exists. Should attempt geocode with session postal code.
     */
    test('Case 3: needsZip=false, needsGeo=true → geocode with session postal code', async () => {
      const existingZip = '80304';

      const sub = await makeSubscriber(db, {
        zipcode: existingZip,
        lat: null,
        lon: null,
        climate_zone_id: null
      });

      const result = await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test3',
        subscription: 'sub_test3',
        customer_details: {
          address: { postal_code: '33139' }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(true);
      expect(result.zipcode).toBeNull();
      expect(result.lat).toBeCloseTo(25.7, 1);
      expect(result.lon).toBeCloseTo(-80.2, 1);
      expect(result.climateZone).toBe('florida_southern');

      const { rows } = await db.query(
        `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = $1`,
        [sub.id]
      );
      const updated = rows[0];
      expect(updated.zipcode).toBe(existingZip);
      expect(updated.lat).toBeCloseTo(25.7, 1);
      expect(updated.lon).toBeCloseTo(-80.2, 1);
      expect(updated.climate_zone_id).toBe('florida_southern');
    });

    /**
     * Case 4: needsZip=false, needsGeo=false
     * Both zipcode and coordinates already present. No-op.
     */
    test('Case 4: needsZip=false, needsGeo=false → no-op', async () => {
      const existingZip = '80304';
      const existingLat = 40.0;
      const existingLon = -105.25;
      const existingZone = 'high_plains';

      const sub = await makeSubscriber(db, {
        zipcode: existingZip,
        lat: existingLat,
        lon: existingLon,
        climate_zone_id: existingZone
      });

      const result = await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test4',
        subscription: 'sub_test4',
        customer_details: {
          address: { postal_code: '98101' }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(false);
      expect(result.zipcode).toBeNull();

      const { rows } = await db.query(
        `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = $1`,
        [sub.id]
      );
      const updated = rows[0];
      expect(updated.zipcode).toBe(existingZip);
      expect(updated.lat).toBeCloseTo(existingLat, 1);
      expect(updated.lon).toBeCloseTo(existingLon, 1);
      expect(updated.climate_zone_id).toBe(existingZone);
    });
  });

  describe('Edge cases', () => {
    test('no postal_code in session → no backfill', async () => {
      const sub = await makeSubscriber(db, {
        zipcode: null,
        lat: null,
        lon: null
      });

      const result = await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_nozip',
        subscription: 'sub_nozip',
        customer_details: { address: {} },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(false);
      const { rows } = await db.query(
        `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode, lat, lon FROM subscribers WHERE id = $1`,
        [sub.id]
      );
      expect(rows[0].zipcode).toBeNull();
      expect(rows[0].lat).toBeNull();
    });

    test('unknown zipcode in session → backfill zip only, geo returns null', async () => {
      const sub = await makeSubscriber(db, {
        zipcode: null,
        lat: null,
        lon: null
      });

      const result = await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_unknown',
        subscription: 'sub_unknown',
        customer_details: {
          address: { postal_code: '99999' }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(false);
      expect(result.zipcode).toBe('99999');

      const { rows } = await db.query(
        `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode, lat, lon FROM subscribers WHERE id = $1`,
        [sub.id]
      );
      expect(rows[0].zipcode).toBe('99999');
      expect(rows[0].lat).toBeNull();
    });

    test('session with no metadata → no-op', async () => {
      const sub = await makeSubscriber(db, { zipcode: null });

      const result = await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_nometa',
        subscription: 'sub_nometa',
        customer_details: { address: { postal_code: '80304' } },
        metadata: {}
      }, mockGeocoder);

      expect(result).toBeNull();
      const { rows } = await db.query(
        `SELECT pgp_sym_decrypt(zipcode, '${K}')::text as zipcode FROM subscribers WHERE id = $1`,
        [sub.id]
      );
      expect(rows[0].zipcode).toBeNull();
    });
  });

  describe('Plan detection', () => {
    test('weekly plan sets +7 day end date', async () => {
      const sub = await makeSubscriber(db, {
        zipcode: null,
        lat: null
      });
      const before = new Date();

      await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_weekly',
        subscription: 'sub_weekly',
        customer_details: { address: { postal_code: '80304' } },
        metadata: { subscriberId: sub.id, plan: 'weekly' }
      }, mockGeocoder);

      const { rows } = await db.query('SELECT subscription_end_date FROM subscribers WHERE id = $1', [sub.id]);
      const endDate = new Date(rows[0].subscription_end_date);
      const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(7);
    });

    test('monthly plan sets +30 day end date', async () => {
      const sub = await makeSubscriber(db, {
        zipcode: null,
        lat: null
      });
      const before = new Date();

      await handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_monthly',
        subscription: 'sub_monthly',
        customer_details: { address: { postal_code: '80304' } },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      const { rows } = await db.query('SELECT subscription_end_date FROM subscribers WHERE id = $1', [sub.id]);
      const endDate = new Date(rows[0].subscription_end_date);
      const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(30);
    });
  });
});
