/**
 * Weather abstraction layer
 * US: NWS (existing, detailed)
 * International: Open-Meteo (free, no key, global)
 */

const https = require('https');
const { getStationInfo } = require('./nws');

const USER_AGENT = 'PlotLines/1.0 (garden newsletter)';

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': USER_AGENT, ...headers }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── WMO weather code descriptions ───────────────────────────────────────────
const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Heavy drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

// ─── Open-Meteo (international + US fallback) ─────────────────────────────────
async function getWeatherOpenMeteo(lat, lon, timezone = 'auto') {
  const tz = encodeURIComponent(timezone || 'auto');
  const url = [
    `https://api.open-meteo.com/v1/forecast?`,
    `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`,
    `&current=temperature_2m,precipitation,weathercode,windspeed_10m,relative_humidity_2m`,
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode`,
    `&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`,
    `&forecast_days=7&timezone=${tz}`,
  ].join('');

  const data = await fetchJson(url);

  if (!data.current) throw new Error('Open-Meteo returned no current data');

  const cur = data.current;
  const daily = data.daily;
  const code = cur.weathercode || 0;
  const desc = WMO_CODES[code] || 'Variable conditions';

  // Build current summary
  const current = `${desc}, ${Math.round(cur.temperature_2m)}°F, `
    + `wind ${Math.round(cur.windspeed_10m)} mph, `
    + `humidity ${cur.relative_humidity_2m}%`;

  // Build 7-day forecast
  const days = (daily.time || []).map((date, i) => {
    const hi = Math.round(daily.temperature_2m_max[i]);
    const lo = Math.round(daily.temperature_2m_min[i]);
    const wcode = daily.weathercode[i];
    const wdesc = WMO_CODES[wcode] || 'Variable';
    const precip = daily.precipitation_sum[i];
    return `${date}: ${wdesc}, High ${hi}°F / Low ${lo}°F${precip > 0 ? `, ${precip.toFixed(2)}"` : ''}`;
  }).join('\n');

  return {
    source: 'open-meteo',
    current,
    forecast: days,
    raw: { current: cur, daily },
  };
}

// ─── NWS (US only) ────────────────────────────────────────────────────────────
async function getWeatherNWS(lat, lon) {
  try {
    // Get grid info
    const station = await getStationInfo(lat, lon);
    if (!station) throw new Error('No NWS station found');

    // Get forecast
    const forecastData = await fetchJson(station.forecastUrl);
    const periods = forecastData.properties?.periods || [];

    const current = periods[0]
      ? `${periods[0].shortForecast}, ${periods[0].temperature}°${periods[0].temperatureUnit}, `
        + `wind ${periods[0].windSpeed} ${periods[0].windDirection}`
      : 'Conditions unavailable';

    const forecast = periods.slice(0, 14).map(p =>
      `${p.name}: ${p.shortForecast}, ${p.temperature}°${p.temperatureUnit}`
    ).join('\n');

    return {
      source: 'nws',
      stationCode: station.gridId,
      current,
      forecast,
      raw: { periods },
    };
  } catch (err) {
    throw new Error(`NWS failed: ${err.message}`);
  }
}

// ─── Main weather router ──────────────────────────────────────────────────────
/**
 * Get weather for any location
 * US: tries NWS first, falls back to Open-Meteo
 * International: Open-Meteo directly
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} country - ISO 2-letter
 * @param {string} timezone
 * @returns {Promise<{source, current, forecast, stationCode?, raw}>}
 */
async function getWeather(lat, lon, country = 'US', timezone = 'auto') {
  const isUS = (country || 'US').toUpperCase() === 'US';

  if (isUS) {
    try {
      return await getWeatherNWS(lat, lon);
    } catch (nwsErr) {
      console.warn(`[weather] NWS failed (${nwsErr.message}), falling back to Open-Meteo`);
    }
  }

  return await getWeatherOpenMeteo(lat, lon, timezone);
}

/**
 * Detect weather type from conditions (for masthead selection)
 * @param {string} current - current conditions string
 * @returns {string} weather_type
 */
function detectWeatherType(current = '') {
  // Valid masthead types: sunny, cloudy, rainy, snowy, frost, heat
  const c = current.toLowerCase();
  if (c.includes('snow') || c.includes('blizzard') || c.includes('flurr')) return 'snowy';
  if (c.includes('frost') || c.includes('freez') || c.includes('ice')) return 'frost';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle') || c.includes('thunder')) return 'rainy';
  if (c.includes('fog') || c.includes('cloud') || c.includes('overcast') || c.includes('partly')) return 'cloudy';
  if (c.includes('hot') || c.includes('heat') || c.includes('humid') || c.includes('scorch')) return 'heat';
  if (c.includes('clear') || c.includes('sunny') || c.includes('fair')) return 'sunny';
  return 'cloudy'; // safe default — never returns invalid type
}

module.exports = { getWeather, getWeatherOpenMeteo, getWeatherNWS, detectWeatherType };
