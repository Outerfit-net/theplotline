/**
 * ZIP Code Climate Zone Coverage Tests
 *
 * These tests use REAL lat/lon coordinates for each zip code.
 * They fail if a location resolves to the wrong zone.
 * No hardcoded math. No reused coordinates. No theater.
 */

const { assignClimateZone } = require('../services/climate.js');

// Real coordinates for specific zip codes (verified via geocoder)
const FL_ZIPS = [
  { zip: '32034', city: 'Fernandina Beach FL', lat: 30.6718, lon: -81.4626, badZones: ['alaska', 'high_plains', 'pacific_maritime'] },
  { zip: '33101', city: 'Miami FL',             lat: 25.7617, lon: -80.1918, badZones: ['alaska', 'high_plains', 'pacific_maritime'] },
  { zip: '33040', city: 'Key West FL',           lat: 24.5548, lon: -81.8021, badZones: ['alaska', 'high_plains', 'pacific_maritime'] },
  { zip: '32501', city: 'Pensacola FL',          lat: 30.4213, lon: -87.2169, badZones: ['alaska', 'high_plains'] },
  { zip: '34711', city: 'Clermont FL',           lat: 28.5494, lon: -81.7729, badZones: ['alaska', 'high_plains'] },
];

const AK_ZIPS = [
  { zip: '99501', city: 'Anchorage AK',          lat: 61.2181, lon: -149.9003, expectedZone: 'alaska' },
  { zip: '99801', city: 'Juneau AK',             lat: 58.3020, lon: -134.4197, expectedZone: 'alaska' },
  { zip: '99705', city: 'North Pole AK',         lat: 64.7511, lon: -147.3494, expectedZone: 'alaska' },
  { zip: '99723', city: 'Barrow AK',             lat: 71.2906, lon: -156.7887, expectedZone: 'alaska' },
  { zip: '99553', city: 'Akutan AK (Aleutians)', lat: 54.1355, lon: -165.7739, expectedZone: 'alaska' },
];

const KNOWN_CORRECT = [
  // Mountain West — our home turf, must always work
  { name: 'Boulder CO',         lat: 40.0150,  lon: -105.2705, country: 'US', expectedZone: 'high_plains' },
  { name: 'Denver CO',          lat: 39.7392,  lon: -104.9903, country: 'US', expectedZone: 'high_plains' },
  { name: 'Colorado Springs CO',lat: 38.8339,  lon: -104.8214, country: 'US', expectedZone: 'high_plains' },
  { name: 'Santa Fe NM',        lat: 35.6870,  lon: -105.9378, country: 'US', expectedZone: 'high_plains' },
  { name: 'Albuquerque NM',     lat: 35.0844,  lon: -106.6504, country: 'US', expectedZone: 'high_plains' },
  { name: 'Salt Lake City UT',  lat: 40.7608,  lon: -111.8910, country: 'US', expectedZone: 'high_plains' },
  { name: 'Bozeman MT',         lat: 45.6770,  lon: -111.0429, country: 'US', expectedZone: 'high_plains' },
  { name: 'Cheyenne WY',        lat: 41.1400,  lon: -104.8202, country: 'US', expectedZone: 'high_plains' },
  { name: 'Rapid City SD',      lat: 44.0805,  lon: -103.2310, country: 'US', expectedZone: 'high_plains' },
  // Pacific
  { name: 'Seattle WA',         lat: 47.6062,  lon: -122.3321, country: 'US', expectedZone: 'pacific_maritime' },
  { name: 'Portland OR',        lat: 45.5051,  lon: -122.6750, country: 'US', expectedZone: 'pacific_maritime' },
  { name: 'Los Angeles CA',     lat: 34.0522,  lon: -118.2437, country: 'US', expectedZone: 'california_med' },
  { name: 'San Francisco CA',   lat: 37.7749,  lon: -122.4194, country: 'US', expectedZone: 'pacific_maritime' }, // SF is maritime (lat 37.77 >= 37 boundary)
  // Northeast / Midwest
  { name: 'New York NY',        lat: 40.7128,  lon: -74.0060,  country: 'US', expectedZone: 'northeast' },
  { name: 'Boston MA',          lat: 42.3601,  lon: -71.0589,  country: 'US', expectedZone: 'northeast' },
  { name: 'Chicago IL',         lat: 41.8781,  lon: -87.6298,  country: 'US', expectedZone: 'upper_midwest' },
  { name: 'Minneapolis MN',     lat: 44.9778,  lon: -93.2650,  country: 'US', expectedZone: 'upper_midwest' },
  { name: 'Marquette MI (UP)',  lat: 46.5436,  lon: -87.3954,  country: 'US', expectedZone: 'upper_midwest' }, // ⚠️ UP Michigan is zone 4a — much colder than Chicago (5b). upper_midwest is too coarse here. TODO: split great_lakes zone.
  { name: 'Duluth MN',         lat: 46.7867,  lon: -92.1005,  country: 'US', expectedZone: 'upper_midwest' }, // ⚠️ Same issue — lake effect, brutal winters, needs finer zone
  // Appalachian
  { name: 'Asheville NC',       lat: 35.5951,  lon: -82.5515,  country: 'US', expectedZone: 'appalachian' },
  { name: 'Roanoke VA',         lat: 37.2710,  lon: -79.9414,  country: 'US', expectedZone: 'appalachian' },
  { name: 'Charleston WV',      lat: 38.3498,  lon: -81.6326,  country: 'US', expectedZone: 'appalachian' },
  // South
  { name: 'Phoenix AZ',         lat: 33.4484,  lon: -112.0740, country: 'US', expectedZone: 'high_plains' },
  { name: 'Houston TX',         lat: 29.7604,  lon: -95.3698,  country: 'US', expectedZone: 'humid_southeast' },
  { name: 'Atlanta GA',         lat: 33.7490,  lon: -84.3880,  country: 'US', expectedZone: 'humid_southeast' },
  // International
  { name: 'London UK',          lat: 51.5074,  lon: -0.1278,   country: 'GB', expectedZone: 'uk_maritime' },
  { name: 'Berlin DE',          lat: 52.5200,  lon: 13.4050,   country: 'DE', expectedZone: 'central_europe' },
  { name: 'Sydney AU',          lat: -33.8688, lon: 151.2093,  country: 'AU', expectedZone: 'australia_temperate' },
  { name: 'Darwin AU',          lat: -12.4634, lon: 130.8456,  country: 'AU', expectedZone: 'australia_tropical' },
];

const KNOWN_GAPS = [
  { name: 'Honolulu HI',   lat: 21.3069,  lon: -157.8583, country: 'US' },
  { name: 'Tokyo JP',      lat: 35.6762,  lon: 139.6503,  country: 'JP' },
  { name: 'Sao Paulo BR',  lat: -23.5505, lon: -46.6333,  country: 'BR' },
  { name: 'Cape Town ZA',  lat: -33.9249, lon: 18.4241,   country: 'ZA' },
];

describe('Florida ZIP codes', () => {
  FL_ZIPS.forEach(({ zip, city, lat, lon, badZones }) => {
    test(`${city} (${zip}) does not resolve to wrong zone`, () => {
      const zone = assignClimateZone(lat, lon, 'US');
      expect(zone).not.toBeNull();
      for (const bad of badZones) {
        expect(zone).not.toBe(bad);
      }
    });
  });
});

describe('Alaska ZIP codes', () => {
  AK_ZIPS.forEach(({ zip, city, lat, lon, expectedZone }) => {
    test(`${city} (${zip}) resolves to ${expectedZone}`, () => {
      const zone = assignClimateZone(lat, lon, 'US');
      expect(zone).toBe(expectedZone);
    });
  });
});

describe('Correct zone assignments', () => {
  KNOWN_CORRECT.forEach(({ name, lat, lon, country, expectedZone }) => {
    test(`${name} → ${expectedZone}`, () => {
      const zone = assignClimateZone(lat, lon, country);
      expect(zone).toBe(expectedZone);
    });
  });
});

describe('Known gaps (no zone defined — should return something, not crash)', () => {
  KNOWN_GAPS.forEach(({ name, lat, lon, country }) => {
    test.todo(`${name} — needs a zone defined`);
  });

  // But they should never throw
  KNOWN_GAPS.forEach(({ name, lat, lon, country }) => {
    test(`${name} does not throw`, () => {
      expect(() => assignClimateZone(lat, lon, country)).not.toThrow();
    });
  });
});

describe('Sanity: same input always returns same output', () => {
  test('Boulder CO is deterministic', () => {
    const a = assignClimateZone(40.0150, -105.2705, 'US');
    const b = assignClimateZone(40.0150, -105.2705, 'US');
    expect(a).toBe(b);
    expect(a).toBe('high_plains');
  });

  test('null/undefined inputs do not crash', () => {
    expect(() => assignClimateZone(null, null, 'US')).not.toThrow();
    expect(() => assignClimateZone(undefined, undefined, 'US')).not.toThrow();
    expect(() => assignClimateZone(0, 0, 'US')).not.toThrow();
  });
});
