/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Supports international locations via country code
 * Supports US zip codes for more precise location matching
 */

const https = require('https');
const USER_AGENT = 'PlotLines/1.0 (garden newsletter)';

// ISO2 → Nominatim countrycodes
const COUNTRY_CODE_MAP = {
  'GB': 'gb', 'UK': 'gb', 'IE': 'ie',
  'AU': 'au', 'NZ': 'nz',
  'CA': 'ca', 'US': 'us',
  'DE': 'de', 'FR': 'fr', 'ES': 'es', 'IT': 'it',
  'NL': 'nl', 'BE': 'be', 'AT': 'at', 'CH': 'ch',
  'PL': 'pl', 'CZ': 'cz', 'SE': 'se', 'NO': 'no',
  'DK': 'dk', 'FI': 'fi', 'PT': 'pt', 'GR': 'gr',
  'ZA': 'za', 'IN': 'in', 'JP': 'jp', 'BR': 'br',
  'MX': 'mx', 'AR': 'ar', 'CL': 'cl',
};

/**
 * Geocode a city/zipcode to lat/lon
 * @param {string} query - City name or US zipcode
 * @param {string} countryOrState - ISO2 country code (e.g. 'GB') or US state abbr
 * @returns {Promise<{lat, lon, displayName}|null>}
 */
async function geocode(query, countryOrState = 'US') {
  const code = (countryOrState || 'US').toUpperCase();
  const nominatimCountry = COUNTRY_CODE_MAP[code];

  let url;
  
  // Check if query is a US zipcode (5 or 9 digit format)
  const isZipcode = code === 'US' && /^\d{5}(-\d{4})?$/.test(query);
  
  if (isZipcode) {
    // Use postal code search for US zipcodes
    const q = encodeURIComponent(query);
    url = `https://nominatim.openstreetmap.org/search?postalcode=${q}&country=US&format=json&limit=1`;
  } else if (nominatimCountry && code !== 'US') {
    // International: use countrycodes param for precision
    const q = encodeURIComponent(query);
    url = `https://nominatim.openstreetmap.org/search?city=${q}&format=json&limit=1&countrycodes=${nominatimCountry}`;
  } else {
    // US city: include state in query for disambiguation
    const q = encodeURIComponent(`${query}, ${countryOrState}, USA`);
    url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`;
  }

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': USER_AGENT }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (!results.length) { resolve(null); return; }
          const r = results[0];
          resolve({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), displayName: r.display_name });
        } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Geocode timeout')); });
  });
}

module.exports = { geocode };

/**
 * Geocode with retry on 429 rate limit
 */
async function geocodeWithRetry(query, countryOrState, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await geocode(query, countryOrState);
      if (result) return result;
      // If null result, wait and retry
      await new Promise(r => setTimeout(r, (i + 1) * 1000));
    } catch (e) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, (i + 1) * 1200));
        continue;
      }
      throw e;
    }
  }
  return null;
}

module.exports = { geocode, geocodeWithRetry };
