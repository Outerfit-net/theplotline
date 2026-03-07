/**
 * Climate zone assignment
 * Assigns a subscriber to a climate zone based on lat/lon
 * Uses Köppen-inspired bounding box logic — good enough, not meteorologically perfect
 * 
 * Updated 2026-03-06: Expanded from 16 to 28 zones
 * - Great Lakes split from upper_midwest
 * - Hawaii, Florida Keys, Desert Southwest added
 * - Alaska split into interior/coastal
 * - International zones added (Japan, Iceland, South Africa, Brazil)
 */

// Zone definitions with bounding boxes and priority order
// First match wins, so order matters (more specific before more general)
const ZONE_RULES = [
  // ── SOUTHERN HEMISPHERE ────────────────────────────────────────────────────
  {
    id: 'australia_tropical',
    test: (lat, lon, country) =>
      country === 'AU' && lat > -22,
  },
  {
    id: 'australia_temperate',
    test: (lat, lon, country) =>
      country === 'AU' && lat <= -22,
  },
  {
    id: 'south_africa_subtropical',
    test: (lat, lon, country) =>
      country === 'ZA' && lat >= -32 && lat <= -26,
  },
  {
    id: 'south_africa_temperate',
    test: (lat, lon, country) =>
      country === 'ZA' && lat < -30,
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
  {
    id: 'iceland_subarctic',
    test: (lat, lon, country) =>
      country === 'IS',
  },

  // ── ASIA ───────────────────────────────────────────────────────────────────
  {
    id: 'japan_temperate',
    test: (lat, lon, country) =>
      country === 'JP',
  },

  // ── SOUTH AMERICA ──────────────────────────────────────────────────────────
  {
    id: 'brazil_subtropical',
    test: (lat, lon, country) =>
      country === 'BR',
  },

  // ── CANADA ────────────────────────────────────────────────────────────────
  {
    id: 'canada_prairie',
    test: (lat, lon, country) =>
      country === 'CA' && lon >= -120 && lon <= -95 && lat >= 49,
  },
  {
    id: 'canada_maritime',
    test: (lat, lon, country) =>
      country === 'CA',
  },

  // ── UNITED STATES ─────────────────────────────────────────────────────────
  
  // DESERT SOUTHWEST (Phoenix, Tucson, Las Vegas, El Paso) - lat 31-37, lon -117 to -106
  {
    id: 'desert_southwest',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 31 && lat <= 37 && lon >= -117 && lon <= -106,
  },

  // PACIFIC COAST (before desert to catch Seattle/Portland)
  {
    id: 'pacific_maritime',
    test: (lat, lon, country) =>
      country === 'US' && lon <= -116 && lat >= 42 && lat <= 50,
  },

  // CALIFORNIA (northern/central CA - must come AFTER desert_southwest)
  {
    id: 'california_med',
    test: (lat, lon, country) =>
      country === 'US' && lon <= -114 && lat >= 32 && lat <= 42,
  },

  // HAWAII (before catch-all)
  {
    id: 'hawaii',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 19 && lat <= 23 && lon >= -160 && lon <= -155,
  },

  // FLORIDA KEYS TROPICAL (before florida_southern)
  {
    id: 'florida_keys_tropical',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 24.3 && lat <= 25.5 && lon >= -82 && lon <= -80,
  },

  // FLORIDA SOUTHERN (northern FL - Tampa/Jacksonville area)
  {
    id: 'florida_southern',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 25 && lat <= 30 && lon >= -88 && lon <= -80,
  },

  // GREAT LAKES (Cleveland, Detroit, Marquette, Duluth, Green Bay) - lon extended to -93 for Duluth
  {
    id: 'great_lakes',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 41 && lat <= 48 && lon >= -93 && lon <= -80,
  },

  // UPPER MIDWEST CONTINENTAL (Minneapolis, Chicago, Milwaukee)
  {
    id: 'upper_midwest_continental',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 41 && lat <= 49 && lon >= -97 && lon <= -84,
  },

  // APPALACHIAN (mountains - Asheville, Roanoke, Pittsburgh, Knoxville) - must come BEFORE humid_subtropical
  {
    id: 'appalachian',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 35 && lat <= 42 && lon >= -85 && lon <= -76,
  },

  // HUMID SUBTROPICAL (Gulf Coast + Piedmont + Southeast)
  {
    id: 'humid_subtropical',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 25 && lat <= 36 && lon >= -97 && lon <= -75,
  },

  // SOUTHERN PLAINS (South Texas - San Antonio, Austin, McAllen)
  {
    id: 'southern_plains',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 25 && lat <= 32 && lon >= -100 && lon <= -97,
  },

  // NORTHEAST
  {
    id: 'northeast',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 40 && lat <= 47 && lon >= -80 && lon <= -66,
  },

  // HIGH PLAINS (Intermountain West - must come before great_plains)
  {
    id: 'high_plains',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 32 && lat <= 49 && lon >= -117 && lon <= -102,
  },

  // GREAT PLAANS (central US catch-all - after upper_midwest_continental)
  {
    id: 'great_plains',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 29 && lat <= 48 && lon >= -103 && lon <= -89,
  },

  // ALASKA: Interior (far north - Fairbanks, Barrow) - lat >= 64 (north of Alaska Range)
  {
    id: 'alaska_interior',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 64,
  },

  // ALASKA: South Coastal (Anchorage, Juneau, Ketchikan) - lat 54-64, coastal lon
  {
    id: 'alaska_south_coastal',
    test: (lat, lon, country) =>
      country === 'US' && lat >= 54 && lat < 64 && lon > -170 && lon <= -130,
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
 * @param {object} db - pg Pool or compatible (must have .query())
 * @param {string} climateZoneId
 * @param {string} hemisphere
 * @param {Date} date - defaults to now
 * @returns {Promise<object|null>} micro_season row
 */
async function getCurrentMicroSeason(db, climateZoneId, hemisphere = 'N', date = new Date()) {
  const doy = getDayOfYear(date, hemisphere);

  // Find micro-season that contains this day
  const { rows: [season] } = await db.query(`
    SELECT * FROM micro_seasons
    WHERE climate_zone_id = $1
      AND day_of_year_start <= $2
      AND day_of_year_end >= $3
    ORDER BY day_of_year_start DESC
    LIMIT 1
  `, [climateZoneId, doy, doy]);

  if (season) {
    season.topic_weights = JSON.parse(season.topic_weights || '{}');
    return season;
  }

  // Fallback: nearest season
  const { rows: [nearest] } = await db.query(`
    SELECT * FROM micro_seasons
    WHERE climate_zone_id = $1
    ORDER BY ABS(day_of_year_start - $2) ASC
    LIMIT 1
  `, [climateZoneId, doy]);

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
