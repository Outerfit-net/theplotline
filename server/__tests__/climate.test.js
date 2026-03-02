import { test, expect, describe } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const climateModule = await import('../services/climate.js');
const { assignClimateZone, getHemisphere, getDayOfYear, getGenericSeason } = climateModule;

describe('Climate Zone Assignment', () => {
  test('Boulder CO → high_plains', () => expect(assignClimateZone(40.01, -105.27, 'US')).toBe('high_plains'));
  test('Denver CO → high_plains', () => expect(assignClimateZone(39.74, -104.99, 'US')).toBe('high_plains'));
  test('Salt Lake City → high_plains', () => expect(assignClimateZone(40.76, -111.89, 'US')).toBe('high_plains'));
  test('Seattle WA → pacific_maritime', () => expect(assignClimateZone(47.61, -122.33, 'US')).toBe('pacific_maritime'));
  test('Portland OR → pacific_maritime', () => expect(assignClimateZone(45.52, -122.68, 'US')).toBe('pacific_maritime'));
  test('Los Angeles → california_med', () => expect(assignClimateZone(34.05, -118.24, 'US')).toBe('california_med'));
  test('Minneapolis → upper_midwest', () => expect(assignClimateZone(44.98, -93.27, 'US')).toBe('upper_midwest'));
  test('Chicago → upper_midwest', () => expect(assignClimateZone(41.88, -87.63, 'US')).toBe('upper_midwest'));
  test('Kansas City → great_plains', () => expect(assignClimateZone(39.10, -94.58, 'US')).toBe('great_plains'));
  test('Atlanta GA → humid_southeast', () => expect(assignClimateZone(33.75, -84.39, 'US')).toBe('humid_southeast'));
  test('Houston TX → humid_southeast', () => expect(assignClimateZone(29.76, -95.37, 'US')).toBe('humid_southeast'));
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
