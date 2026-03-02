/**
 * Subscriber routes — v2: global climate zone system
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');

const { geocodeWithRetry: geocode } = require('../services/geocode');
const { getStationInfo } = require('../services/nws');
const { sendConfirmationEmail } = require('../services/email');
const { assignClimateZone, getHemisphere } = require('../services/climate');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'plotlines.db');

function getDb() { return new Database(DB_PATH); }
function generateToken() { return crypto.randomBytes(32).toString('hex'); }

/**
 * Build a location_key for combinations table
 * US: use NWS grid ID (e.g. BOU)
 * International: round lat/lon to ~5km grid
 */
function buildLocationKey(country, stationCode, lat, lon) {
  if ((country || 'US').toUpperCase() === 'US' && stationCode) {
    return stationCode;
  }
  // Round to 2 decimal places (~1km precision, good enough for weather)
  const rLat = Math.round(lat * 20) / 20;
  const rLon = Math.round(lon * 20) / 20;
  return `${rLat}:${rLon}`;
}

async function subscriberRoutes(fastify) {

  // ── POST /api/subscribe ───────────────────────────────────────────────────
  fastify.post('/subscribe', async (request, reply) => {
    const {
      email,
      city,
      state,
      zipcode = '',
      country = 'US',
      author = 'hemingway',
    } = request.body;

    if (!email || !city) {
      return reply.code(400).send({ error: 'Missing required fields: email, city' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    const db = getDb();
    try {
      // Check existing
      const existing = db.prepare(
        'SELECT id, active, confirmed_at FROM subscribers WHERE email = ?'
      ).get(email);

      if (existing) {
        if (existing.active && existing.confirmed_at) {
          return reply.code(409).send({
            error: 'Email already subscribed',
            message: 'This email is already subscribed to The Plot Line.'
          });
        }
        // Reactivate or resend
        const confirmToken = generateToken();
        const unsubscribeToken = generateToken();
        if (!existing.active) {
          db.prepare(`
            UPDATE subscribers SET active=1, unsubscribed_at=NULL,
              confirm_token=?, unsubscribe_token=?,
              location_city=?, location_state=?, location_country=?, author_key=?, zipcode=?
            WHERE id=?
          `).run(confirmToken, unsubscribeToken, city, state || '', country, author, zipcode || '', existing.id);
          await sendConfirmationEmail(email, confirmToken);
          return reply.code(200).send({ message: 'Subscription reactivated. Please check your email to confirm.' });
        }
        db.prepare('UPDATE subscribers SET confirm_token=? WHERE id=?').run(confirmToken, existing.id);
        await sendConfirmationEmail(email, confirmToken);
        return reply.code(200).send({ message: 'Confirmation email resent. Please check your inbox.' });
      }

      // ── Resolve location ──────────────────────────────────────────────────
      let lat = null, lon = null, stationCode = null, timezone = null;
      
      // Prefer zipcode for geocoding if provided
      const locationQuery = (zipcode && country.toUpperCase() === 'US')
        ? zipcode
        : state ? `${city}, ${state}` : `${city}, ${country}`;

      try {
        const geo = await geocode(locationQuery, country);
        if (geo) {
          lat = geo.lat;
          lon = geo.lon;

          // US: get NWS station
          if (country.toUpperCase() === 'US' && state) {
            try {
              const station = await getStationInfo(lat, lon);
              if (station) stationCode = station.gridId;
            } catch (e) {
              console.warn('[subscribe] NWS station lookup failed:', e.message);
            }
          }
        }
      } catch (geoErr) {
        console.error('[subscribe] Geocoding error:', geoErr.message);
      }

      // ── Assign climate zone ───────────────────────────────────────────────
      let climateZoneId = null;
      let hemisphere = 'N';
      if (lat !== null) {
        climateZoneId = assignClimateZone(lat, lon, country);
        hemisphere = getHemisphere(lat);
      }

      // ── Insert subscriber ─────────────────────────────────────────────────
      const id = uuidv4();
      const confirmToken = generateToken();
      const unsubscribeToken = generateToken();

      db.prepare(`
        INSERT INTO subscribers (
          id, email, location_city, location_state, location_country, zipcode,
          lat, lon, hemisphere, author_key, climate_zone_id, station_code,
          confirm_token, unsubscribe_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, email, city, state || '', country, zipcode || '',
        lat, lon, hemisphere, author, climateZoneId, stationCode,
        confirmToken, unsubscribeToken
      );

      // ── Create or find combination ────────────────────────────────────────
      if (lat !== null) {
        const locationKey = buildLocationKey(country, stationCode, lat, lon);
        const existingCombo = db.prepare(
          'SELECT id FROM combinations WHERE location_key=? AND author_key=?'
        ).get(locationKey, author);

        if (!existingCombo) {
          db.prepare(`
            INSERT INTO combinations (
              id, location_key, author_key, climate_zone_id,
              location_city, location_state, location_country,
              lat, lon, hemisphere, station_code,
              weather_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(), locationKey, author, climateZoneId,
            city, state || '', country,
            lat, lon, hemisphere, stationCode,
            country.toUpperCase() === 'US' ? 'nws' : 'open-meteo'
          );
        }
      }

      // Send confirmation
      await sendConfirmationEmail(email, confirmToken);

      db.close();
      return reply.code(201).send({
        message: 'Subscription created. Please check your email to confirm.',
        id,
        climate_zone: climateZoneId,
      });

    } catch (err) {
      db.close();
      console.error('[subscribe] Error:', err);
      return reply.code(500).send({ error: 'Failed to create subscription' });
    }
  });

  // ── GET /api/confirm/:token ───────────────────────────────────────────────
  fastify.get('/confirm/:token', async (request, reply) => {
    const { token } = request.params;
    const db = getDb();
    try {
      const subscriber = db.prepare(
        'SELECT id, email, confirmed_at FROM subscribers WHERE confirm_token=?'
      ).get(token);

      if (!subscriber) return reply.code(404).send({ error: 'Invalid confirmation token' });

      if (subscriber.confirmed_at) {
        return reply.code(200).send({ message: 'Email already confirmed', email: subscriber.email });
      }

      db.prepare(
        "UPDATE subscribers SET confirmed_at=datetime('now'), confirm_token=NULL WHERE id=?"
      ).run(subscriber.id);

      db.close();
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return reply.redirect(`${clientUrl}?confirmed=true`);
    } catch (err) {
      db.close();
      return reply.code(500).send({ error: 'Failed to confirm subscription' });
    }
  });

  // ── GET/POST /api/unsubscribe ─────────────────────────────────────────────
  fastify.get('/unsubscribe', async (request, reply) => handleUnsubscribe(request.query.token, reply));
  fastify.post('/unsubscribe', async (request, reply) => handleUnsubscribe(request.body.token, reply));

  async function handleUnsubscribe(token, reply) {
    if (!token) return reply.code(400).send({ error: 'Missing unsubscribe token' });
    const db = getDb();
    try {
      const subscriber = db.prepare(
        'SELECT id, email FROM subscribers WHERE unsubscribe_token=?'
      ).get(token);

      if (!subscriber) return reply.code(404).send({ error: 'Invalid unsubscribe token' });

      db.prepare(
        "UPDATE subscribers SET active=0, unsubscribed_at=datetime('now') WHERE id=?"
      ).run(subscriber.id);

      db.close();
      return reply.code(200).send({ message: 'Successfully unsubscribed', email: subscriber.email });
    } catch (err) {
      db.close();
      return reply.code(500).send({ error: 'Failed to unsubscribe' });
    }
  }

  // ── GET /api/subscriber/:token ─────────────────────────────────────────────
  // Let subscribers check their own status / preferences by unsubscribe token
  fastify.get('/subscriber/:token', async (request, reply) => {
    const { token } = request.params;
    const db = getDb();
    try {
      const sub = db.prepare(`
        SELECT s.id, s.email, s.location_city, s.location_state, s.location_country,
               s.author_key, s.climate_zone_id, s.active, s.confirmed_at,
               cz.name as climate_zone_name
        FROM subscribers s
        LEFT JOIN climate_zones cz ON cz.id = s.climate_zone_id
        WHERE s.unsubscribe_token = ?
      `).get(token);

      if (!sub) return reply.code(404).send({ error: 'Not found' });

      db.close();
      return reply.code(200).send(sub);
    } catch (err) {
      db.close();
      return reply.code(500).send({ error: 'Failed to fetch subscriber' });
    }
  });

  // ── GET /api/climate-zones ─────────────────────────────────────────────────
  fastify.get('/climate-zones', async (request, reply) => {
    const db = getDb();
    try {
      const zones = db.prepare('SELECT * FROM climate_zones ORDER BY name').all();
      db.close();
      return reply.code(200).send({ zones });
    } catch (err) {
      db.close();
      return reply.code(500).send({ error: 'Failed to fetch climate zones' });
    }
  });
}

module.exports = subscriberRoutes;
