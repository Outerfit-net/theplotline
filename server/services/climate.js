/**
 * Climate zone assignment
 * Assigns a subscriber to a climate zone based on lat/lon
 * Uses Köppen-inspired bounding box logic — good enough, not meteorologically perfect
 */

// Zone definitions with bounding boxes and priority order
// First match wins, so order matters (more specific before more general)
const ZONE_RULES = [
  // ── SOUTHERN HEMISPHERE ────────────────────────────────────────────────────
  {
    id: 'australia_tropical',
    test: (lat, lon, country) =>
      country === 'AU' && lat > -20,
  },
  {
    id: 'australia_temperate',
    test: (lat, lon, country) =>
      country === 'AU' && lat <= -20,
  },

  // ── UK & IRELAND ──────────────────────────────────────────────────────────
  {
    id: 'uk_maritime',
    test: (lat, lon, country) =>
      ['GB', 'IE'].includes(country),
  },

  // ── EUROPE ────────────────────────────────────────────────────────────────
  {
    id: 'mediterranean_eu',
    test: (lat, lon, country) =>
      ['ES', 'PT', 'IT', 'GR', 'HR', 'ME', 'AL', 'MK', 'RS', 'BA'].includes(country) ||
      (country === 'FR' && lat < 44),
  },
  {
    id: 'central_europe',
    test: (lat, lon, country) =>
      ['DE', 'AT', 'CH', 'NL', 'BE', 'LU', 'PL', 'CZ', 'SK', 'HU',
       'DK', 'SE', 'NO', 'FI', 'EE', 'LV', 'LT'].includes(country) ||
      (country === 'FR' && lat >= 44),
  },

  // ── CANADA ────────────────────────────────────────────────────────────────
  {
    id: 'canada_prairie',
    test: (lat, lon, country) =>
      country === 'CA' && lon >= -115 && lon <= -95 && lat >= 49,
  },
  {
    id: 'canada_maritime',
    test: (lat, lon, country) =>
      country === 'CA',
  },

  // ── UNITED STATES ─────────────────────────────────────────────────────────
  // Pacific Maritime: West Coast north of ~37°N
  {
    id: 'pacific_maritime',
    test: (lat, lon, country) =>
      country === 'US' && lon <= -116 && lat >= 37 && lat <= 50,
  },
  // California Mediterranean: CA inland + coast south of 37°N
  {
    id: 'california_med',
    test: (lat, lon, country) =>
      country === 'US' && lon <= -114 && lat < 40 && lat > 32,
  },
  // High Plains / Intermountain: CO, WY, MT, ID, UT, NV, NM, AZ (non-desert)
  {
    id: 'high_plains',
    test: (lat, lon, country) =>
      country === 'US' && lon >= -116 && lon <= -100 && lat >= 31 && lat <= 49,
  },
  // Appalachian / Mid-Atlantic (check before humid_southeast — overlapping region)
  {
    id: 'appalachian',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 35 && lat <= 42 && lon >= -84 && lon <= -78,
  },
  // Humid Southeast
  {
    id: 'humid_southeast',
    test: (lat, lon, country) =>
      country === 'US' && lat < 37 && lon >= -100,
  },
  // Upper Midwest
  {
    id: 'upper_midwest',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 41 && lat <= 49 && lon >= -97 && lon <= -80,
  },
  // Northeast
  {
    id: 'northeast',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 37 && lat <= 47 && lon >= -84,
  },
  // Great Plains (catch-all for central US)
  {
    id: 'great_plains',
    test: (lat, lon, country) =>
      country === 'US',
  },
];

/**
 * Assign a climate zone based on lat/lon/country
 * @param {number} lat
 * @param {number} lon
 * @param {string} country - ISO 2-letter code e.g. 'US', 'GB', 'AU'
 * @returns {string} climate zone id
 */
function assignClimateZone(lat, lon, country = 'US') {
  const c = (country || 'US').toUpperCase();

  for (const rule of ZONE_RULES) {
    try {
      if (rule.test(lat, lon, c)) {
        return rule.id;
      }
    } catch (e) {
      // skip bad rule
    }
  }

  // Ultimate fallback: northern vs southern hemisphere generic
  return lat < 0 ? 'australia_temperate' : 'northeast';
}

/**
 * Determine hemisphere from lat
 * @param {number} lat
 * @returns {'N'|'S'}
 */
function getHemisphere(lat) {
  return lat < 0 ? 'S' : 'N';
}

/**
 * Get day-of-year adjusted for southern hemisphere
 * Southern hemisphere subscribers are 6 months offset
 * @param {Date} date
 * @param {string} hemisphere 'N' or 'S'
 * @returns {number} 1-365
 */
function getDayOfYear(date, hemisphere = 'N') {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  let doy = Math.floor(diff / oneDay);

  if (hemisphere === 'S') {
    doy = ((doy + 182) % 365) + 1;
    if (doy < 1) doy += 365;
  }

  return Math.max(1, Math.min(365, doy));
}

/**
 * Look up the current micro-season for a climate zone
 * @param {object} db - better-sqlite3 instance
 * @param {string} climateZoneId
 * @param {string} hemisphere
 * @param {Date} date - defaults to now
 * @returns {object|null} micro_season row
 */
function getCurrentMicroSeason(db, climateZoneId, hemisphere = 'N', date = new Date()) {
  const doy = getDayOfYear(date, hemisphere);

  // Find micro-season that contains this day
  const season = db.prepare(`
    SELECT * FROM micro_seasons
    WHERE climate_zone_id = ?
      AND day_of_year_start <= ?
      AND day_of_year_end >= ?
    ORDER BY day_of_year_start DESC
    LIMIT 1
  `).get(climateZoneId, doy, doy);

  if (season) {
    season.topic_weights = JSON.parse(season.topic_weights || '{}');
    return season;
  }

  // Fallback: nearest season
  const nearest = db.prepare(`
    SELECT * FROM micro_seasons
    WHERE climate_zone_id = ?
    ORDER BY ABS(day_of_year_start - ?) ASC
    LIMIT 1
  `).get(climateZoneId, doy);

  if (nearest) {
    nearest.topic_weights = JSON.parse(nearest.topic_weights || '{}');
  }

  return nearest || null;
}

/**
 * Get season name from day of year (generic fallback)
 */
function getGenericSeason(doy, hemisphere = 'N') {
  let adjustedDoy = doy;
  if (hemisphere === 'S') {
    adjustedDoy = ((doy + 182) % 365) + 1;
  }

  if (adjustedDoy >= 355 || adjustedDoy <= 59) return 'late_winter';
  if (adjustedDoy <= 151) return 'spring';
  if (adjustedDoy <= 243) return 'summer';
  return 'fall';
}

module.exports = {
  assignClimateZone,
  getHemisphere,
  getDayOfYear,
  getCurrentMicroSeason,
  getGenericSeason,
};
