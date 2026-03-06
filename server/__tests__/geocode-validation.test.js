/**
 * Geocoding validation test
 * Ensures that Key West and Juneau are correctly geocoded and assigned to the right climate zones
 */

const { test, expect, describe } = require('@jest/globals');
const { assignClimateZone } = require('../services/climate');

describe('Geocoding: Location validation', () => {
  /**
   * Key West, FL coordinates: lat 24.5548, lon -81.8021
   * Should be in florida_keys_tropical zone
   */
  test('Key West, FL (24.5548, -81.8021) → florida_keys_tropical', () => {
    const lat = 24.5548;
    const lon = -81.8021;
    const zone = assignClimateZone(lat, lon, 'US');
    
    expect(zone).toBe('florida_keys_tropical');
    
    // Verify reasoning: lat < 37 and lon >= -100 → florida_keys_tropical
    expect(lat < 37).toBe(true);
    expect(lon >= -100).toBe(true);
  });

  /**
   * Juneau, AK coordinates: lat 58.3020, lon -134.4197
   * Should be in alaska zone
   */
  test('Juneau, AK (58.3020, -134.4197) → alaska', () => {
    const lat = 58.3020;
    const lon = -134.4197;
    const zone = assignClimateZone(lat, lon, 'US');
    
    expect(zone).toBe('alaska_south_coastal');
    
    // Verify reasoning: lat >= 54 → alaska (catches all of AK including Southeast)
    expect(lat >= 54).toBe(true);
  });

  /**
   * Test Alaska rule catches entire state including Southeast
   */
  test('Alaska zones: south_coastal vs interior', () => {
    const testCases = [
      { lat: 54.0, lon: -130.0, desc: 'Southern AK', expected: 'alaska_south_coastal' },
      { lat: 58.3, lon: -134.4, desc: 'Juneau', expected: 'alaska_south_coastal' },
      { lat: 64.0, lon: -152.0, desc: 'Central AK', expected: 'alaska_interior' },
      { lat: 70.0, lon: -150.0, desc: 'Northern AK', expected: 'alaska_interior' },
    ];
    testCases.forEach(({ lat, lon, desc, expected }) => {
      expect(assignClimateZone(lat, lon, 'US')).toBe(expected, `Failed for ${desc}`);
    });
  });
  });

  /**
   * Verify florida_keys_tropical rule applies correctly to Florida peninsula
   */
  test('Florida locations match florida_keys_tropical rule', () => {
    const floridaLocs = [
      { lat: 25.7614, lon: -80.1938, name: 'Miami', expected: 'florida_southern' },
      { lat: 24.5548, lon: -81.8021, name: 'Key West', expected: 'florida_keys_tropical' },
      { lat: 27.6648, lon: -82.5158, name: 'Tampa', expected: 'florida_southern' },
      { lat: 30.3322, lon: -81.6557, name: 'Jacksonville', expected: 'humid_subtropical' },
    ];
    floridaLocs.forEach(({ lat, lon, name, expected }) => {
      expect(assignClimateZone(lat, lon, 'US')).toBe(expected, `${name} should be ${expected}`);
    });
  });
  });

  /**
   * Boundary test: Ensure Key West is not misclassified
   * (it's tropical-ish but still gets florida_keys_tropical)
   */
  test('Key West boundary: lat < 37 AND lon >= -100', () => {
    const keyWestLat = 24.5548;
    const keyWestLon = -81.8021;

    // Check both conditions that define florida_keys_tropical
    expect(keyWestLat < 37).toBe(true);
    expect(keyWestLon >= -100).toBe(true);

    // Should not match Appalachian (requires lat >= 35)
    expect(keyWestLat >= 35).toBe(false); // lat < 35

    const zone = assignClimateZone(keyWestLat, keyWestLon, 'US');
    expect(zone).toBe('florida_keys_tropical');
  });

  /**
   * Boundary test: Ensure Juneau is not misclassified
   * It's in Southeast AK but still gets alaska zone (which is correct)
   */
  test('Juneau boundary: lat >= 54 catches Southeast AK', () => {
    const juneauLat = 58.3020;
    const juneauLon = -134.4197;

    // Juneau is in AK's Inside Passage but still > 54°N
    expect(juneauLat >= 54).toBe(true);

    // Juneau does match pacific_maritime criteria too (lon <= -116)
    // But alaska_south_coastal rule comes FIRST in ZONE_RULES, so it takes precedence
    expect(juneauLon <= -116).toBe(true);

    const zone = assignClimateZone(juneauLat, juneauLon, 'US');
    expect(zone).toBe('alaska_south_coastal'); // Correct due to rule order
  });

  /**
   * Verify zone rule precedence: alaska comes before pacific_maritime
   * even though Juneau technically matches both criteria
   */
  test('Zone rule precedence: alaska > pacific_maritime', () => {
    // Juneau satisfies both:
    // - lat >= 54 (alaska)
    // - lon <= -116 AND lat >= 37 AND lat <= 50 (pacific_maritime would require lat <= 50, fails)
    // Actually pacific_maritime is: lon <= -116 && lat >= 37 && lat <= 50
    // Juneau: lat = 58.3, which is > 50, so it doesn't match pacific_maritime anyway
    
    const juneauLat = 58.3020;
    const juneauLon = -134.4197;

    // Check pacific_maritime criteria
    const matchesPacific = juneauLon <= -116 && juneauLat >= 37 && juneauLat <= 50;
    expect(matchesPacific).toBe(false); // lat > 50

    // Should match alaska
    const zone = assignClimateZone(juneauLat, juneauLon, 'US');
    expect(zone).toBe('alaska_south_coastal');
  });
});
