/**
 * National Weather Service API integration
 * Gets weather station codes from coordinates
 */

const https = require('https');

const USER_AGENT = 'PlotLines/1.0 (newsletter service)';

/**
 * Get NWS grid info and station code from lat/lon
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{gridId: string, stationCode: string, forecastUrl: string} | null>}
 */
async function getStationInfo(lat, lon) {
  const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;

  return new Promise((resolve, reject) => {
    // Step 1: Get points data
    const req = https.get(pointsUrl, {
      headers: { 'User-Agent': USER_AGENT }
    }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const points = JSON.parse(data);
          const props = points.properties;

          if (!props) {
            resolve(null);
            return;
          }

          const gridId = props.gridId; // Forecast office (e.g., BOU)
          const stationsUrl = props.observationStations;

          // Step 2: Get observation stations
          const stationCode = await getFirstStation(stationsUrl);

          resolve({
            gridId,
            stationCode: stationCode || gridId,
            forecastUrl: props.forecast
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('NWS points request timeout'));
    });
  });
}

/**
 * Get first observation station from stations URL
 * @param {string} stationsUrl
 * @returns {Promise<string | null>}
 */
function getFirstStation(stationsUrl) {
  return new Promise((resolve, reject) => {
    const req = https.get(stationsUrl, {
      headers: { 'User-Agent': USER_AGENT }
    }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const stations = JSON.parse(data);
          if (stations.features && stations.features.length > 0) {
            resolve(stations.features[0].properties.stationIdentifier);
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('NWS stations request timeout'));
    });
  });
}

module.exports = { getStationInfo };
