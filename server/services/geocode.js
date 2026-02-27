/**
 * Geocoding service using Nominatim (OpenStreetMap)
 */

const https = require('https');

const USER_AGENT = 'PlotLines/1.0 (newsletter service)';

/**
 * Geocode a city/state to lat/lon
 * @param {string} city
 * @param {string} state
 * @returns {Promise<{lat: number, lon: number, displayName: string} | null>}
 */
async function geocode(city, state) {
  const query = encodeURIComponent(`${city}, ${state}, USA`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': USER_AGENT }
    }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.length === 0) {
            resolve(null);
            return;
          }

          const result = results[0];
          resolve({
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            displayName: result.display_name
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Geocode request timeout'));
    });
  });
}

module.exports = { geocode };
