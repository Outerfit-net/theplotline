const { test, expect, describe } = require('@jest/globals');
const { assignClimateZone, getHemisphere, getDayOfYear, getGenericSeason } = require('../services/climate');

describe('Climate Zone Assignment', () => {
  test('Boulder CO → high_plains', () => expect(assignClimateZone(40.01, -105.27, 'US')).toBe('high_plains'));
  test('Denver CO → high_plains', () => expect(assignClimateZone(39.74, -104.99, 'US')).toBe('high_plains'));
  test('Salt Lake City → high_plains', () => expect(assignClimateZone(40.76, -111.89, 'US')).toBe('high_plains'));
  test('Seattle WA → pacific_maritime', () => expect(assignClimateZone(47.61, -122.33, 'US')).toBe('pacific_maritime'));
  test('Portland OR → pacific_maritime', () => expect(assignClimateZone(45.52, -122.68, 'US')).toBe('pacific_maritime'));
  test('Los Angeles → california_med', () => expect(assignClimateZone(34.05, -118.24, 'US')).toBe('california_med'));
  test('Minneapolis → upper_midwest_continental', () => expect(assignClimateZone(44.98, -93.27, 'US')).toBe('upper_midwest_continental'));
  test('Chicago → great_lakes', () => expect(assignClimateZone(41.88, -87.63, 'US')).toBe('great_lakes'));
  test('Kansas City → great_plains', () => expect(assignClimateZone(39.10, -94.58, 'US')).toBe('great_plains'));
  test('Atlanta GA → humid_subtropical', () => expect(assignClimateZone(33.75, -84.39, 'US')).toBe('humid_subtropical'));
  test('Houston TX → humid_subtropical', () => expect(assignClimateZone(29.76, -95.37, 'US')).toBe('humid_subtropical'));
  test('Boston MA → northeast', () => expect(assignClimateZone(42.36, -71.06, 'US')).toBe('northeast'));
  test('New York → northeast', () => expect(assignClimateZone(40.71, -74.01, 'US')).toBe('northeast'));
  test('Asheville NC → appalachian', () => expect(assignClimateZone(35.57, -82.55, 'US')).toBe('appalachian'));
  test('London GB → uk_maritime', () => expect(assignClimateZone(51.51, -0.13, 'GB')).toBe('uk_maritime'));
  test('Dublin IE → uk_maritime', () => expect(assignClimateZone(53.33, -6.25, 'IE')).toBe('uk_maritime'));
  test('Berlin DE → central_europe', () => expect(assignClimateZone(52.52, 13.40, 'DE')).toBe('central_europe'));
  test('Paris FR → central_europe', () => expect(assignClimateZone(48.85, 2.35, 'FR')).toBe('central_europe'));
  test('Barcelona → mediterranean_eu', () => expect(assignClimateZone(41.39, 2.15, 'ES')).toBe('mediterranean_eu'));
  test('Rome IT → mediterranean_eu', () => expect(assignClimateZone(41.90, 12.50, 'IT')).toBe('mediterranean_eu'));
  test('Melbourne → australia_temperate', () => expect(assignClimateZone(-37.81, 144.96, 'AU')).toBe('australia_temperate'));
  test('Sydney → australia_temperate', () => expect(assignClimateZone(-33.87, 151.21, 'AU')).toBe('australia_temperate'));
  test('Darwin → australia_tropical', () => expect(assignClimateZone(-12.46, 130.84, 'AU')).toBe('australia_tropical'));
  test('Calgary → canada_prairie', () => expect(assignClimateZone(51.05, -114.07, 'CA')).toBe('canada_prairie'));
  test('Toronto → canada_maritime', () => expect(assignClimateZone(43.65, -79.38, 'CA')).toBe('canada_maritime'));
});

describe('New zones — US expansion 2026-03-06', () => {
  // GREAT LAKES (new split from upper_midwest)
  test('Marquette MI (UP) → great_lakes', () => 
    expect(assignClimateZone(46.50, -87.60, 'US')).toBe('great_lakes'));
  test('Duluth MN → great_lakes', () => 
    expect(assignClimateZone(46.78, -92.10, 'US')).toBe('great_lakes'));
  test('Cleveland OH → great_lakes', () => 
    expect(assignClimateZone(41.50, -81.70, 'US')).toBe('great_lakes'));
  test('Detroit MI → great_lakes', () => 
    expect(assignClimateZone(42.33, -83.05, 'US')).toBe('great_lakes'));
  test('Green Bay WI → great_lakes', () => 
    expect(assignClimateZone(44.51, -88.01, 'US')).toBe('great_lakes'));

  // HAWAII (new zone)
  test('Honolulu HI → hawaii', () => 
    expect(assignClimateZone(21.31, -157.86, 'US')).toBe('hawaii'));
  test('Hilo HI → hawaii', () => 
    expect(assignClimateZone(19.73, -155.09, 'US')).toBe('hawaii'));
  test('Maui HI → hawaii', () => 
    expect(assignClimateZone(20.80, -156.34, 'US')).toBe('hawaii'));

  // FLORIDA TROPICAL (new zones)
  test('Miami FL → florida_southern', () => 
    expect(assignClimateZone(25.76, -80.19, 'US')).toBe('florida_southern'));
  test('Tampa FL → florida_southern', () => 
    expect(assignClimateZone(27.97, -82.46, 'US')).toBe('florida_southern'));
  test('Jacksonville FL → humid_subtropical', () => 
    expect(assignClimateZone(30.33, -81.66, 'US')).toBe('humid_subtropical'));
  test('Key West FL → florida_keys_tropical', () => 
    expect(assignClimateZone(24.55, -81.80, 'US')).toBe('florida_keys_tropical'));

  // DESERT SOUTHWEST (new zone)
  test('Phoenix AZ → desert_southwest', () => 
    expect(assignClimateZone(33.45, -112.07, 'US')).toBe('desert_southwest'));
  test('Las Vegas NV → desert_southwest', () => 
    expect(assignClimateZone(36.17, -115.14, 'US')).toBe('desert_southwest'));
  test('Tucson AZ → desert_southwest', () => 
    expect(assignClimateZone(32.22, -110.97, 'US')).toBe('desert_southwest'));

  // SOUTHERN PLAINS (new zone)
  test('San Antonio TX → southern_plains', () => 
    expect(assignClimateZone(29.42, -98.49, 'US')).toBe('southern_plains'));
  test('McAllen TX → southern_plains', () => 
    expect(assignClimateZone(26.20, -98.23, 'US')).toBe('southern_plains'));

  // ALASKA (refined)
  test('Anchorage AK → alaska_south_coastal', () => 
    expect(assignClimateZone(61.22, -149.90, 'US')).toBe('alaska_south_coastal'));
  test('Juneau AK → alaska_south_coastal', () => 
    expect(assignClimateZone(58.30, -134.42, 'US')).toBe('alaska_south_coastal'));
  test('Fairbanks AK → alaska_interior', () => 
    expect(assignClimateZone(64.84, -147.72, 'US')).toBe('alaska_interior'));
  test('Barrow AK → alaska_interior', () => 
    expect(assignClimateZone(71.29, -156.79, 'US')).toBe('alaska_interior'));
});

describe('New zones — International expansion 2026-03-06', () => {
  test('Tokyo JP → japan_temperate', () => 
    expect(assignClimateZone(35.68, 139.65, 'JP')).toBe('japan_temperate'));
  test('Osaka JP → japan_temperate', () => 
    expect(assignClimateZone(34.69, 135.50, 'JP')).toBe('japan_temperate'));
  test('Reykjavik IS → iceland_subarctic', () => 
    expect(assignClimateZone(64.14, -21.90, 'IS')).toBe('iceland_subarctic'));
  test('Cape Town ZA → south_africa_temperate', () => 
    expect(assignClimateZone(-33.92, 18.42, 'ZA')).toBe('south_africa_temperate'));
  test('Durban ZA → south_africa_subtropical', () => 
    expect(assignClimateZone(-29.87, 31.03, 'ZA')).toBe('south_africa_subtropical'));
  test('São Paulo BR → brazil_subtropical', () => 
    expect(assignClimateZone(-23.55, -46.63, 'BR')).toBe('brazil_subtropical'));
  test('Rio de Janeiro BR → brazil_subtropical', () => 
    expect(assignClimateZone(-22.91, -43.17, 'BR')).toBe('brazil_subtropical'));
});

describe('Hemisphere', () => {
  test('North lat → N', () => expect(getHemisphere(40)).toBe('N'));
  test('South lat → S', () => expect(getHemisphere(-37)).toBe('S'));
});

describe('Day of Year', () => {
  test('Jan 1 = 1', () => expect(getDayOfYear(new Date(2026, 0, 1), 'N')).toBe(1));
  test('Dec 31 = 365', () => expect(getDayOfYear(new Date(2026, 11, 31), 'N')).toBe(365));
  test('S hemisphere offset', () => {
    const s = getDayOfYear(new Date(2026, 0, 1), 'S');
    expect(Math.abs(s - 183)).toBeLessThanOrEqual(3);
  });
});

describe('Generic Season', () => {
  test('Jan → late_winter', () => expect(getGenericSeason(10, 'N')).toBe('late_winter'));
  test('Apr → spring', () => expect(getGenericSeason(100, 'N')).toBe('spring'));
  test('Jul → summer', () => expect(getGenericSeason(200, 'N')).toBe('summer'));
  test('Oct → fall', () => expect(getGenericSeason(280, 'N')).toBe('fall'));
  test('S Jan → summer', () => expect(getGenericSeason(1, 'S')).toBe('summer'));
});
