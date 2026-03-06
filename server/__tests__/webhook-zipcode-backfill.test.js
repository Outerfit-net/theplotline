/**
 * Webhook tests: checkout.session.completed with zipcode backfill combinations
 * Tests the 4 permutations of needsZip and needsGeo flags
 */

const { test, expect, describe, beforeEach, afterEach } = require('@jest/globals');
const { initTestDb } = require('./setup');
const { v4: uuidv4 } = require('uuid');
const { assignClimateZone } = require('../services/climate');

// ── Helpers for test setup ─────────────────────────────────────────────────

function getTestDb() {
  const db = initTestDb(':memory:');
  
  // Seed some climate zones for foreign key constraints
  const zones = ['high_plains', 'california_med', 'humid_subtropical', 'alaska_south_coastal', 'pacific_maritime'];
  for (const zone of zones) {
    db.prepare(`
      INSERT OR IGNORE INTO climate_zones (id, name)
      VALUES (?, ?)
    `).run(zone, zone);
  }
  
  return db;
}

function makeSubscriber(db, overrides = {}) {
  const id = uuidv4();
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const token = uuidv4();

  db.prepare(`
    INSERT INTO subscribers (
      id, email, unsubscribe_token, plan, subscription_status,
      subscription_end_date, stripe_customer_id, stripe_subscription_id,
      active, confirmed_at, zipcode, lat, lon, climate_zone_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?, ?, ?, ?)
  `).run(
    overrides.id || id,
    overrides.email || email,
    overrides.token || token,
    overrides.plan || 'monthly',
    overrides.status || 'active',
    overrides.end_date || '2026-04-15',
    overrides.stripe_customer_id || `cus_${id}`,
    overrides.stripe_sub_id || `sub_${id}`,
    overrides.zipcode || null,
    overrides.lat || null,
    overrides.lon || null,
    overrides.climate_zone_id || null
  );

  return { id: overrides.id || id, email: overrides.email || email, token: overrides.token || token };
}

/**
 * Simulate the webhook handler's zipcode backfill logic
 * Returns { geocoded: boolean, zipcode: string, lat: number, lon: number, climateZone: string }
 */
function handleCheckoutCompletedWithBackfill(db, session, geoCodeFn) {
  const { subscriberId, plan } = session.metadata || {};
  if (!subscriberId) return null;

  const existing = db.prepare('SELECT zipcode, lat, lon FROM subscribers WHERE id = ?').get(subscriberId);
  const needsZip = !existing?.zipcode;
  const needsGeo = !existing?.lat;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (plan === 'monthly' ? 30 : 7));

  // Update base subscription fields
  db.prepare(`
    UPDATE subscribers
    SET stripe_customer_id = ?,
        stripe_subscription_id = ?,
        plan = ?,
        subscription_status = ?,
        subscription_end_date = ?
    WHERE id = ?
  `).run(
    session.customer,
    session.subscription,
    plan,
    'active',
    endDate.toISOString().split('T')[0],
    subscriberId
  );

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
      db.prepare('UPDATE subscribers SET zipcode = ? WHERE id = ?').run(postalCode, subscriberId);
      result.zipcode = postalCode;
    }

    // Attempt geocoding if coordinates are needed
    if (needsGeo) {
      try {
        const geo = geoCodeFn(postalCode);
        if (geo) {
          const zoneId = assignClimateZone(geo.lat, geo.lon, 'US');
          db.prepare('UPDATE subscribers SET lat = ?, lon = ?, climate_zone_id = ? WHERE id = ?')
            .run(geo.lat, geo.lon, zoneId, subscriberId);
          result.geocoded = true;
          result.lat = geo.lat;
          result.lon = geo.lon;
          result.climateZone = zoneId;
        }
      } catch (e) {
        // Geocoding failure is non-fatal
      }
    }
  }

  return result;
}

/**
 * Mock geocoder for testing
 */
const mockGeocode = {
  '80304': { lat: 40.0, lon: -105.25, name: 'Boulder, CO' }, // boulder
  '33139': { lat: 25.7, lon: -80.2, name: 'Miami, FL' }, // miami
  '90210': { lat: 34.09, lon: -118.41, name: 'Beverly Hills, CA' }, // LA
  '98101': { lat: 47.6, lon: -122.33, name: 'Seattle, WA' }, // seattle
};

function mockGeocoder(zipcode) {
  return mockGeocode[zipcode] || null;
}

// ── Test Suite ────────────────────────────────────────────────────────────

describe('Webhook: checkout.session.completed with zipcode backfill', () => {
  let db;
  beforeEach(() => { db = getTestDb(); });
  afterEach(() => { if (db) db.close(); });

  describe('4-way zipcode backfill combinations', () => {
    /**
     * Case 1: needsZip=true, needsGeo=true
     * Both zipcode and coordinates are missing. Should backfill both via geocoding.
     */
    test('Case 1: needsZip=true, needsGeo=true → backfill both', () => {
      const sub = makeSubscriber(db, {
        zipcode: null,   // missing
        lat: null,       // missing
        lon: null,
        climate_zone_id: null
      });

      const result = handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test1',
        subscription: 'sub_test1',
        customer_details: {
          address: {
            postal_code: '80304' // Boulder, CO
          }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(true);
      expect(result.zipcode).toBe('80304');
      expect(result.lat).toBeCloseTo(40.0, 1);
      expect(result.lon).toBeCloseTo(-105.25, 1);
      expect(result.climateZone).toBe('high_plains');

      const updated = db.prepare('SELECT zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = ?').get(sub.id);
      expect(updated.zipcode).toBe('80304');
      expect(updated.lat).toBeCloseTo(40.0, 1);
      expect(updated.lon).toBeCloseTo(-105.25, 1);
      expect(updated.climate_zone_id).toBe('high_plains');
    });

    /**
     * Case 2: needsZip=true, needsGeo=false
     * Only zipcode is missing, but coordinates already exist. Should only fill zipcode.
     */
    test('Case 2: needsZip=true, needsGeo=false → backfill only zipcode', () => {
      const existingLat = 34.09;
      const existingLon = -118.41;
      const existingZone = 'california_med';

      const sub = makeSubscriber(db, {
        zipcode: null,   // missing
        lat: existingLat,
        lon: existingLon,
        climate_zone_id: existingZone
      });

      const result = handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test2',
        subscription: 'sub_test2',
        customer_details: {
          address: {
            postal_code: '90210' // LA area
          }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.zipcode).toBe('90210');
      expect(result.geocoded).toBe(false); // Should not re-geocode
      expect(result.lat).toBeNull(); // Not returned because geocoding didn't happen
      expect(result.climateZone).toBeNull();

      const updated = db.prepare('SELECT zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = ?').get(sub.id);
      expect(updated.zipcode).toBe('90210');
      expect(updated.lat).toBeCloseTo(existingLat, 1); // unchanged
      expect(updated.lon).toBeCloseTo(existingLon, 1); // unchanged
      expect(updated.climate_zone_id).toBe(existingZone); // unchanged
    });

    /**
     * Case 3: needsZip=false, needsGeo=true
     * Coordinates are missing but zipcode already exists. Should attempt geocode with session postal code.
     */
    test('Case 3: needsZip=false, needsGeo=true → geocode with session postal code', () => {
      const existingZip = '80304';

      const sub = makeSubscriber(db, {
        zipcode: existingZip, // already present
        lat: null,            // missing coords
        lon: null,
        climate_zone_id: null
      });

      const result = handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test3',
        subscription: 'sub_test3',
        customer_details: {
          address: {
            postal_code: '33139' // Miami - use this for geocoding
          }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      // Should geocode with the session postal code because we need coordinates
      expect(result.geocoded).toBe(true);
      expect(result.zipcode).toBeNull(); // Don't update zipcode (already have one)
      expect(result.lat).toBeCloseTo(25.7, 1);
      expect(result.lon).toBeCloseTo(-80.2, 1);
      expect(result.climateZone).toBe('humid_subtropical');

      const updated = db.prepare('SELECT zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = ?').get(sub.id);
      expect(updated.zipcode).toBe(existingZip); // unchanged
      expect(updated.lat).toBeCloseTo(25.7, 1); // updated from geocode
      expect(updated.lon).toBeCloseTo(-80.2, 1);
      expect(updated.climate_zone_id).toBe('humid_subtropical');
    });

    /**
     * Case 4: needsZip=false, needsGeo=false
     * Both zipcode and coordinates already present. No-op.
     */
    test('Case 4: needsZip=false, needsGeo=false → no-op', () => {
      const existingZip = '80304';
      const existingLat = 40.0;
      const existingLon = -105.25;
      const existingZone = 'high_plains';

      const sub = makeSubscriber(db, {
        zipcode: existingZip,
        lat: existingLat,
        lon: existingLon,
        climate_zone_id: existingZone
      });

      const result = handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_test4',
        subscription: 'sub_test4',
        customer_details: {
          address: {
            postal_code: '98101' // completely different zip in session
          }
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(false);
      expect(result.zipcode).toBeNull();

      const updated = db.prepare('SELECT zipcode, lat, lon, climate_zone_id FROM subscribers WHERE id = ?').get(sub.id);
      expect(updated.zipcode).toBe(existingZip); // unchanged
      expect(updated.lat).toBeCloseTo(existingLat, 1); // unchanged
      expect(updated.lon).toBeCloseTo(existingLon, 1); // unchanged
      expect(updated.climate_zone_id).toBe(existingZone); // unchanged
    });
  });

  describe('Edge cases', () => {
    test('no postal_code in session → no backfill', () => {
      const sub = makeSubscriber(db, {
        zipcode: null,
        lat: null,
        lon: null
      });

      const result = handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_nozip',
        subscription: 'sub_nozip',
        customer_details: { address: {} }, // no postal_code
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(false);
      const updated = db.prepare('SELECT zipcode, lat, lon FROM subscribers WHERE id = ?').get(sub.id);
      expect(updated.zipcode).toBeNull();
      expect(updated.lat).toBeNull();
    });

    test('unknown zipcode in session → backfill zip only, geo returns null', () => {
      const sub = makeSubscriber(db, {
        zipcode: null,
        lat: null,
        lon: null
      });

      const result = handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_unknown',
        subscription: 'sub_unknown',
        customer_details: {
          address: { postal_code: '99999' } // unknown zip
        },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      expect(result.geocoded).toBe(false); // geocoder returned null
      expect(result.zipcode).toBe('99999');

      const updated = db.prepare('SELECT zipcode, lat, lon FROM subscribers WHERE id = ?').get(sub.id);
      expect(updated.zipcode).toBe('99999');
      expect(updated.lat).toBeNull(); // geocoding failed, so coords still null
    });

    test('session with no metadata → no-op', () => {
      const sub = makeSubscriber(db, { zipcode: null });

      const result = handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_nometa',
        subscription: 'sub_nometa',
        customer_details: { address: { postal_code: '80304' } },
        metadata: {} // no subscriberId
      }, mockGeocoder);

      expect(result).toBeNull();
      const updated = db.prepare('SELECT zipcode FROM subscribers WHERE id = ?').get(sub.id);
      expect(updated.zipcode).toBeNull(); // unchanged
    });
  });

  describe('Plan detection', () => {
    test('weekly plan sets +7 day end date', () => {
      const sub = makeSubscriber(db, {
        zipcode: null,
        lat: null
      });
      const before = new Date();

      handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_weekly',
        subscription: 'sub_weekly',
        customer_details: { address: { postal_code: '80304' } },
        metadata: { subscriberId: sub.id, plan: 'weekly' }
      }, mockGeocoder);

      const updated = db.prepare('SELECT subscription_end_date FROM subscribers WHERE id = ?').get(sub.id);
      const endDate = new Date(updated.subscription_end_date);
      const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(7);
    });

    test('monthly plan sets +30 day end date', () => {
      const sub = makeSubscriber(db, {
        zipcode: null,
        lat: null
      });
      const before = new Date();

      handleCheckoutCompletedWithBackfill(db, {
        customer: 'cus_monthly',
        subscription: 'sub_monthly',
        customer_details: { address: { postal_code: '80304' } },
        metadata: { subscriberId: sub.id, plan: 'monthly' }
      }, mockGeocoder);

      const updated = db.prepare('SELECT subscription_end_date FROM subscribers WHERE id = ?').get(sub.id);
      const endDate = new Date(updated.subscription_end_date);
      const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(30);
    });
  });
});
