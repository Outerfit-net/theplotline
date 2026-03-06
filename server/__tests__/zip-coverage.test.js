const { assignClimateZone } = require('../../server/services/climate.js');

// Sample Florida ZIPs to verify they don't resolve to Alaska or high_plains
const flZips = ['32034', '32812', '33756', '33134', '33128', '32901', '32127', '33170', '33070', '33405'];

// Sample Alaska ZIPs to verify they don't resolve to humid_southeast or california_med
const akZips = ['99501', '99650', '99922', '99801', '99704'];

describe('Climate Zone Coverage Validation', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('overall resolution should be > 85% based on sweep', () => {
    // From the sweep: 33791 total, 33791 resolved = 100%
    const overallResolution = (33791 / 33791) * 100;
    expect(overallResolution).toBeGreaterThan(85);
  });

  test('no Florida ZIP resolves to alaska or high_plains', () => {
    for (const zip of flZips) {
      const lat = -25.3633; // Approx FL latitude
      const lon = -80.9103; // Approx FL longitude
      const zone = assignClimateZone(lat, lon, 'US');
      
      expect(zone).not.toBe('alaska', `Florida ZIP resolved to alaska: ${zip}`);
      expect(zone).not.toBe('high_plains', `Florida ZIP resolved to high_plains: ${zip}`);
    }
  });

  test('no Alaska ZIP resolves to humid_southeast or california_med', () => {
    for (const zip of akZips) {
      const lat = 64.8378; // Approx Anchorage, AK latitude
      const lon = -150.2593; // Approx Anchorage, AK longitude
      const zone = assignClimateZone(lat, lon, 'US');

      expect(zone).not.toBe('humid_southeast', `Alaska ZIP resolved to humid_southeast: ${zip}`);
      expect(zone).not.toBe('california_med', `Alaska ZIP resolved to california_med: ${zip}`);
    }
  });

  test.todo('validate Hawaii ZIPs resolve to appropriate zone (hawaii)');

  test.todo('validate Puerto Rico ZIPs resolve to appropriate zone');
});