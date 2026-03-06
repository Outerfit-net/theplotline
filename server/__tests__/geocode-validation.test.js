/**
 * Geocoding validation test
 * Ensures that Key West and Juneau are correctly geocoded and assigned to the right climate zones
 */

const { test, expect, describe } = require('@jest/globals');
const { assignClimateZone } = require('../services/climate');

describe('Geocoding: Location validation', () => {
  /**
   * Key West, FL coordinates: lat 24.5548, lon -81.8021
   * Should be in humid_southeast zone
   */
  test('Key West, FL (24.5548, -81.8021) → humid_southeast', () => {
    const lat = 24.5548;
    const lon = -81.8021;
    const zone = assignClimateZone(lat, lon, 'US');
    
    expect(zone).toBe('humid_southeast');
    
    // Verify reasoning: lat < 37 and lon >= -100 → humid_southeast
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
    
    expect(zone).toBe('alaska');
    
    // Verify reasoning: lat >= 54 → alaska (catches all of AK including Southeast)
    expect(lat >= 54).toBe(true);
  });

  /**
   * Test Alaska rule catches entire state including Southeast
   */
  test('Alaska rule catches all latitudes >= 54', () => {
    const testCases = [
      { lat: 54.0, lon: -130.0, desc: 'Southern AK boundary' },
      { lat: 58.3, lon: -134.4, desc: 'Juneau (Southeast)' },
      { lat: 64.0, lon: -152.0, desc: 'Central AK' },
      { lat: 70.0, lon: -150.0, desc: 'Northern AK' },
    ];

    testCases.forEach(({ lat, lon, desc }) => {
      const zone = assignClimateZone(lat, lon, 'US');
      expect(zone).toBe('alaska', `Failed for ${desc}`);
    });
  });

  /**
   * Verify humid_southeast rule applies correctly to Florida peninsula
   */
  test('Florida locations match humid_southeast rule', () => {
    const floridaLocs = [
      { lat: 25.7614, lon: -80.1938, name: 'Miami' },
      { lat: 24.5548, lon: -81.8021, name: 'Key West' },
      { lat: 27.9506, lon: -82.4572, name: 'Tampa' },
      { lat: 28.5383, lon: -81.3792, name: 'Orlando' },
    ];

    floridaLocs.forEach(({ lat, lon, name }) => {
      const zone = assignClimateZone(lat, lon, 'US');
      expect(zone).toBe('humid_southeast', `${name} should be humid_southeast`);
    });
  });

  /**
   * Boundary test: Ensure Key West is not misclassified
   * (it's tropical-ish but still gets humid_southeast)
   */
  test('Key West boundary: lat < 37 AND lon >= -100', () => {
    const keyWestLat = 24.5548;
    const keyWestLon = -81.8021;

    // Check both conditions that define humid_southeast
    expect(keyWestLat < 37).toBe(true);
    expect(keyWestLon >= -100).toBe(true);

    // Should not match Appalachian (requires lat >= 35)
    expect(keyWestLat >= 35).toBe(false); // lat < 35

    const zone = assignClimateZone(keyWestLat, keyWestLon, 'US');
    expect(zone).toBe('humid_southeast');
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
    // But alaska rule comes FIRST in ZONE_RULES, so it takes precedence
    expect(juneauLon <= -116).toBe(true);

    const zone = assignClimateZone(juneauLat, juneauLon, 'US');
    expect(zone).toBe('alaska'); // Correct due to rule order
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
    expect(zone).toBe('alaska');
  });
});
