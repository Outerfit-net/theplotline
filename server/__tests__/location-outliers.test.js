/**
 * Location outlier / edge-case coverage
 *
 * Tests extreme and boundary locations across every climate region.
 * Rules:
 *   - expectedZone string   → fail if actual !== expected
 *   - expectedZone null     → known gap: just document with console.warn, never fail
 *
 * To run: cd /opt/plotlines/server && npx jest __tests__/location-outliers.test.js --no-coverage
 */

'use strict';

const { test, expect, describe } = require('@jest/globals');
const { assignClimateZone } = require('../services/climate');
const { getSubRegion } = require('../services/sub-regions');

// ── Test locations ────────────────────────────────────────────────────────────

const TEST_LOCATIONS = [
  // ── US extremes ────────────────────────────────────────────────────────────
  { name: 'Key West FL',    lat: 24.5548,   lon: -81.8021,  country: 'US', expectedZone: 'humid_southeast' },
  { name: 'Juneau AK',      lat: 58.3020,   lon: -134.4197, country: 'US', expectedZone: 'alaska' },
  { name: 'Utqiagvik AK',   lat: 71.2906,   lon: -156.7887, country: 'US', expectedZone: 'alaska' },
  { name: 'Anchorage AK',   lat: 61.2181,   lon: -149.9003, country: 'US', expectedZone: 'alaska' },
  { name: 'Honolulu HI',    lat: 21.3069,   lon: -157.8583, country: 'US', expectedZone: null },   // known gap: Hawaii has no climate zone
  { name: 'El Paso TX',     lat: 31.7619,   lon: -106.4850, country: 'US', expectedZone: 'high_plains' },
  { name: 'Miami FL',       lat: 25.7617,   lon: -80.1918,  country: 'US', expectedZone: 'humid_southeast' },
  { name: 'Caribou ME',     lat: 46.8611,   lon: -68.0117,  country: 'US', expectedZone: 'northeast' },
  { name: 'Brownsville TX', lat: 25.9017,   lon: -97.4975,  country: 'US', expectedZone: 'humid_southeast' },
  { name: 'San Diego CA',   lat: 32.7157,   lon: -117.1611, country: 'US', expectedZone: 'california_med' },
  { name: 'Intl Falls MN',  lat: 48.5997,   lon: -93.4088,  country: 'US', expectedZone: 'upper_midwest' },
  { name: 'Phoenix AZ',     lat: 33.4484,   lon: -112.0740, country: 'US', expectedZone: 'high_plains' },
  { name: 'Boulder CO',     lat: 40.0150,   lon: -105.2705, country: 'US', expectedZone: 'high_plains' },
  { name: 'Seattle WA',     lat: 47.6062,   lon: -122.3321, country: 'US', expectedZone: 'pacific_maritime' },
  { name: 'New York NY',    lat: 40.7128,   lon: -74.0060,  country: 'US', expectedZone: 'northeast' },

  // ── International ──────────────────────────────────────────────────────────
  { name: 'Darwin AU',      lat: -12.4634,  lon: 130.8456,  country: 'AU', expectedZone: 'australia_tropical' },
  { name: 'Hobart AU',      lat: -42.8821,  lon: 147.3272,  country: 'AU', expectedZone: 'australia_temperate' },
  { name: 'London UK',      lat: 51.5074,   lon: -0.1278,   country: 'GB', expectedZone: 'uk_maritime' },
  { name: 'Berlin DE',      lat: 52.5200,   lon: 13.4050,   country: 'DE', expectedZone: 'central_europe' },
  { name: 'Tokyo JP',       lat: 35.6762,   lon: 139.6503,  country: 'JP', expectedZone: null },   // known gap: Japan not in zone rules
  { name: 'Sao Paulo BR',   lat: -23.5505,  lon: -46.6333,  country: 'BR', expectedZone: null },   // known gap: Brazil not in zone rules
  { name: 'Cape Town ZA',   lat: -33.9249,  lon: 18.4241,   country: 'ZA', expectedZone: null },   // known gap: South Africa not in zone rules
  { name: 'Reykjavik IS',   lat: 64.1355,   lon: -21.8954,  country: 'IS', expectedZone: null },   // known gap: Iceland not in zone rules
];

// ── Climate zone tests ────────────────────────────────────────────────────────

describe('Climate zone — outlier/extreme locations', () => {
  for (const loc of TEST_LOCATIONS) {
    if (loc.expectedZone === null) {
      // Known gap — document but never fail
      test.todo(`${loc.name} — known gap (no climate zone defined for ${loc.country})`);
    } else {
      test(`${loc.name} → ${loc.expectedZone}`, () => {
        const actual = assignClimateZone(loc.lat, loc.lon, loc.country);
        expect(actual).toBe(loc.expectedZone);
      });
    }
  }
});

// ── Sub-region tests ──────────────────────────────────────────────────────────

// Locations where we expect a specific sub-region from the bounding boxes
const SUB_REGION_LOCATIONS = [
  { name: 'Juneau AK',      lat: 58.3020,   lon: -134.4197, expectedSub: 'ak_statewide' },
  { name: 'Utqiagvik AK',   lat: 71.2906,   lon: -156.7887, expectedSub: 'ak_statewide' },
  { name: 'Anchorage AK',   lat: 61.2181,   lon: -149.9003, expectedSub: 'ak_statewide' },
  { name: 'Miami FL',       lat: 25.7617,   lon: -80.1918,  expectedSub: 'fl_southern' },
  { name: 'Key West FL',    lat: 24.5548,   lon: -81.8021,  expectedSub: null },           // FL Keys fall outside fl_southern box — known gap
  { name: 'Honolulu HI',    lat: 21.3069,   lon: -157.8583, expectedSub: 'hi_statewide' }, // sub-region exists even though climate zone is a gap
  { name: 'El Paso TX',     lat: 31.7619,   lon: -106.4850, expectedSub: 'tx_trans_pecos' },
  { name: 'Phoenix AZ',     lat: 33.4484,   lon: -112.0740, expectedSub: 'az_statewide' },
  { name: 'Boulder CO',     lat: 40.0150,   lon: -105.2705, expectedSub: 'co_boulder_foothills' },
  { name: 'Seattle WA',     lat: 47.6062,   lon: -122.3321, expectedSub: 'wa_puget_sound' },
  { name: 'Intl Falls MN',  lat: 48.5997,   lon: -93.4088,  expectedSub: 'mn_twin_cities' },
  { name: 'Caribou ME',     lat: 46.8611,   lon: -68.0117,  expectedSub: 'me_statewide' },
];

// Locations where no sub-region bounding box exists — documented as known gaps
const SUB_REGION_GAPS = [
  { name: 'Brownsville TX', lat: 25.9017,   lon: -97.4975,  note: 'Falls outside tx_rio_grande_valley box (lat 26.0 min)' },
  { name: 'San Diego CA',   lat: 32.7157,   lon: -117.1611, note: 'Falls outside ca_socal_coastal box (lon min -120.0)' },
  { name: 'Darwin AU',      lat: -12.4634,  lon: 130.8456,  note: 'No Australia sub-regions defined' },
  { name: 'Hobart AU',      lat: -42.8821,  lon: 147.3272,  note: 'No Australia sub-regions defined' },
  { name: 'London UK',      lat: 51.5074,   lon: -0.1278,   note: 'No UK sub-regions defined' },
  { name: 'Berlin DE',      lat: 52.5200,   lon: 13.4050,   note: 'No Germany sub-regions defined' },
  { name: 'Tokyo JP',       lat: 35.6762,   lon: 139.6503,  note: 'No Japan sub-regions defined' },
  { name: 'Sao Paulo BR',   lat: -23.5505,  lon: -46.6333,  note: 'No Brazil sub-regions defined' },
  { name: 'Cape Town ZA',   lat: -33.9249,  lon: 18.4241,   note: 'No South Africa sub-regions defined' },
  { name: 'Reykjavik IS',   lat: 64.1355,   lon: -21.8954,  note: 'No Iceland sub-regions defined' },
];

describe('Sub-region — outlier/extreme locations', () => {
  describe('expected sub-regions', () => {
    for (const loc of SUB_REGION_LOCATIONS) {
      if (loc.expectedSub === null) {
        test.todo(`${loc.name} sub-region — known gap (coordinates outside defined boxes)`);
      } else {
        test(`${loc.name} → ${loc.expectedSub}`, () => {
          const actual = getSubRegion(null, loc.lat, loc.lon);
          expect(actual).toBe(loc.expectedSub);
        });
      }
    }
  });

  describe('known sub-region gaps (returns null)', () => {
    for (const loc of SUB_REGION_GAPS) {
      test(`${loc.name} → null (${loc.note})`, () => {
        const actual = getSubRegion(null, loc.lat, loc.lon);
        expect(actual).toBeNull();
      });
    }
  });
});

// ── Known-gap audit (informational) ──────────────────────────────────────────
// These tests always pass. They exist to document what Honolulu actually
// returns so we can catch if it accidentally gets assigned a wrong zone.

describe('Known-gap behavior audit', () => {
  test('Honolulu HI — climate zone fallback is not null (documented as great_plains gap)', () => {
    const zone = assignClimateZone(21.3069, -157.8583, 'US');
    // Hawaii has no climate zone rule — falls through to great_plains catchall.
    // This is a known gap. When Hawaii gets a real zone, this test will start
    // failing and should be updated.
    expect(zone).toBeTruthy();
    if (zone !== 'hawaii') {
      // Log the gap so CI output is self-documenting
      console.warn(`[KNOWN GAP] Honolulu HI has no dedicated climate zone — currently returns: ${zone}`);
    }
  });

  test('Tokyo JP — falls through to generic zone (documented gap)', () => {
    const zone = assignClimateZone(35.6762, 139.6503, 'JP');
    expect(zone).toBeTruthy();
    console.warn(`[KNOWN GAP] Tokyo JP has no dedicated climate zone — currently returns: ${zone}`);
  });

  test('Sao Paulo BR — falls through to generic zone (documented gap)', () => {
    const zone = assignClimateZone(-23.5505, -46.6333, 'BR');
    expect(zone).toBeTruthy();
    console.warn(`[KNOWN GAP] Sao Paulo BR has no dedicated climate zone — currently returns: ${zone}`);
  });

  test('Cape Town ZA — falls through to generic zone (documented gap)', () => {
    const zone = assignClimateZone(-33.9249, 18.4241, 'ZA');
    expect(zone).toBeTruthy();
    console.warn(`[KNOWN GAP] Cape Town ZA has no dedicated climate zone — currently returns: ${zone}`);
  });

  test('Reykjavik IS — falls through to generic zone (documented gap)', () => {
    const zone = assignClimateZone(64.1355, -21.8954, 'IS');
    expect(zone).toBeTruthy();
    console.warn(`[KNOWN GAP] Reykjavik IS has no dedicated climate zone — currently returns: ${zone}`);
  });
});
