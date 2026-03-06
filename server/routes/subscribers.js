/**
 * Subscriber routes — v2: global climate zone system
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { geocodeWithRetry: geocode } = require('../services/geocode');
const { getStationInfo } = require('../services/nws');
const { sendConfirmationEmail } = require('../services/email');
const { assignClimateZone, getHemisphere } = require('../services/climate');

const VALID_AUTHORS = [
  'hemingway', 'carver', 'munro', 'morrison', 'oates', 'lopez',
  'strout', 'bass', 'mccarthy', 'oconnor', 'hurston', 'saunders',
  'vonnegut', 'robbins', 'gabaldon'
];

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

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(cf_turnstile_response, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Dev mode: skip verification if secret not set
  if (!secret) {
    console.warn('[turnstile] Secret key not set, skipping verification (dev mode)');
    return { success: true };
  }

  if (!cf_turnstile_response) {
    return { success: false, error: 'No Turnstile response provided' };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: cf_turnstile_response,
        remoteip: remoteip || undefined,
      }),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('[turnstile] Verification error:', err.message);
    return { success: false, error: 'Turnstile verification failed' };
  }
}

async function subscriberRoutes(fastify) {

  // ── POST /api/subscribe ───────────────────────────────────────────────────
  fastify.post('/subscribe', {
    config: {
      rateLimit: { max: 5, timeWindow: '15 minutes' }
    }
  }, async (request, reply) => {
    const {
      email,
      city,
      state,
      zipcode = '',
      country = 'US',
      author = 'hemingway',
      cf_turnstile_response,
    } = request.body;

    if (!email || !city) {
      return reply.code(400).send({ error: 'Missing required fields: email, city' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    // Validate author parameter
    if (!VALID_AUTHORS.includes(author)) {
      return reply.code(400).send({ error: `Invalid author: must be one of ${VALID_AUTHORS.join(', ')}` });
    }

    // ── Verify Turnstile ──────────────────────────────────────────────────────
    const turnstileVerification = await verifyTurnstile(cf_turnstile_response, request.ip);
    if (!turnstileVerification.success) {
      console.warn('[subscribe] Turnstile verification failed:', turnstileVerification);
      return reply.code(403).send({ error: 'Bot check failed' });
    }

    const db = fastify.db;
    try {
      // Check existing
      const existing = await db.prepare(
        'SELECT id, active, confirmed_at, subscription_status FROM subscribers WHERE email = ?'
      ).get(email);

      if (existing) {
        // Block only if they have an active PAID subscription
        if (existing.subscription_status === 'active') {
          return reply.code(409).send({
            error: 'Email already subscribed',
            message: 'This email already has an active paid subscription.'
          });
        }
        
        // If they have a free newsletter but no paid sub, let them proceed to checkout
        // Reactivate or resend
        const confirmToken = generateToken();
        const unsubscribeToken = generateToken();
        if (!existing.active) {
          await db.prepare(`
            UPDATE subscribers SET active=1, unsubscribed_at=NULL,
              confirm_token=?, unsubscribe_token=?, management_token=?,
              auth_token_expires_at=NOW() + INTERVAL '1 year',
              location_city=?, location_state=?, location_country=?, author_key=?, zipcode=?,
              subscribed_at=NOW()
            WHERE id=?
          `).run(confirmToken, unsubscribeToken, uuidv4(), city, state || '', country, author, zipcode || '', existing.id);
          await sendConfirmationEmail(email, confirmToken);
          return reply.code(200).send({ message: 'Subscription reactivated. Please check your email to confirm.' });
        }
        await db.prepare('UPDATE subscribers SET confirm_token=? WHERE id=?').run(confirmToken, existing.id);
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
      const managementToken = uuidv4();

      await db.prepare(`
        INSERT INTO subscribers (
          id, email, location_city, location_state, location_country, zipcode,
          lat, lon, hemisphere, author_key, climate_zone_id, station_code,
          confirm_token, unsubscribe_token, management_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, email, city, state || '', country, zipcode || '',
        lat, lon, hemisphere, author, climateZoneId, stationCode,
        confirmToken, unsubscribeToken, managementToken
      );

      // ── Create or find combination ────────────────────────────────────────
      if (lat !== null) {
        const locationKey = buildLocationKey(country, stationCode, lat, lon);
        const existingCombo = await db.prepare(
          'SELECT id FROM combinations WHERE location_key=? AND author_key=?'
        ).get(locationKey, author);

        if (!existingCombo) {
          await db.prepare(`
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

      return reply.code(201).send({
        message: 'Subscription created. Please check your email to confirm.',
        id,
        climate_zone: climateZoneId,
      });

    } catch (err) {
      console.error('[subscribe] Error:', err);
      return reply.code(500).send({ error: 'Failed to create subscription' });
    }
  });

  // ── GET /api/confirm/:token ───────────────────────────────────────────────
  fastify.get('/confirm/:token', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 hour' }
    }
  }, async (request, reply) => {
    const { token } = request.params;
    const db = fastify.db;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const htmlPage = (title, message) => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Georgia, serif; background: #faf8f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
          .container { background: white; padding: 40px 60px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; }
          h1 { color: #2d4a3e; font-size: 28px; margin-bottom: 16px; }
          p { color: #4a4a4a; font-size: 18px; line-height: 1.6; }
          .emoji { font-size: 48px; margin-bottom: 20px; }
          a { color: #4a7c59; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="emoji">${title.includes('Confirmed') ? '✅' : '🌿'}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <p style="margin-top: 24px;"><a href="${clientUrl}">Return to The Plot Line</a></p>
        </div>
      </body>
      </html>
    `;

    try {
      const subscriber = await db.prepare(
        'SELECT id, email, confirmed_at FROM subscribers WHERE confirm_token=?'
      ).get(token);

      if (!subscriber) {
        return reply.type('text/html').send(htmlPage('Invalid Link', 'This confirmation link is invalid or has expired.'));
      }

      if (subscriber.confirmed_at) {
        return reply.type('text/html').send(htmlPage('Already Confirmed', 'Your email was already confirmed. You\'re all set!'));
      }

      await db.prepare(
        "UPDATE subscribers SET confirmed_at=NOW(), subscribed_at=NOW(), confirm_token=NULL WHERE id=?"
      ).run(subscriber.id);

      return reply.redirect(`${clientUrl}?confirmed=true&email=${encodeURIComponent(subscriber.email)}`);
    } catch (err) {
      return reply.type('text/html').send(htmlPage('Something Went Wrong', 'There was an error confirming your email. Please try again.'));
    }
  });

  // ── GET/POST /api/unsubscribe ─────────────────────────────────────────────
  fastify.get('/unsubscribe', async (request, reply) => handleUnsubscribe(fastify.db, request.query.token, reply));
  fastify.post('/unsubscribe', async (request, reply) => handleUnsubscribe(fastify.db, request.body.token, reply));

  async function handleUnsubscribe(db, token, reply) {
    if (!token) return reply.code(400).send({ error: 'Missing unsubscribe token' });
    try {
      const subscriber = await db.prepare(
        'SELECT id, auth_token_expires_at FROM subscribers WHERE unsubscribe_token=?'
      ).get(token);

      if (!subscriber) return reply.code(404).send({ error: 'Invalid unsubscribe token' });

      // Check token expiry
      if (subscriber.auth_token_expires_at) {
        const expires = new Date(subscriber.auth_token_expires_at);
        if (expires < new Date()) {
          return reply.code(401).send({ error: 'Token expired. Please resubscribe.' });
        }
      }

      await db.prepare(
        "UPDATE subscribers SET active=0, unsubscribed_at=NOW() WHERE id=?"
      ).run(subscriber.id);

      return reply.code(200).send({ message: 'Successfully unsubscribed' });
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to unsubscribe' });
    }
  }

  // ── GET /api/subscriber/:token ─────────────────────────────────────────────
  // Let subscribers check their own status / preferences by unsubscribe token
  fastify.get('/subscriber/:token', async (request, reply) => {
    const { token } = request.params;
    const db = fastify.db;
    try {
      const sub = await db.prepare(`
        SELECT s.id, s.email, s.location_city, s.location_state, s.location_country,
               s.author_key, s.climate_zone_id, s.active, s.confirmed_at,
               s.auth_token_expires_at,
               cz.name as climate_zone_name
        FROM subscribers s
        LEFT JOIN climate_zones cz ON cz.id = s.climate_zone_id
        WHERE s.unsubscribe_token = ?
      `).get(token);

      if (!sub) return reply.code(404).send({ error: 'Not found' });

      // Check token expiry
      if (sub.auth_token_expires_at) {
        const expires = new Date(sub.auth_token_expires_at);
        if (expires < new Date()) {
          return reply.code(401).send({ error: 'Token expired. Please resubscribe.' });
        }
      }

      return reply.code(200).send(sub);
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to fetch subscriber' });
    }
  });

  // ── GET /api/climate-zones ─────────────────────────────────────────────────
  fastify.get('/climate-zones', async (request, reply) => {
    const db = fastify.db;
    try {
      const zones = await db.prepare('SELECT * FROM climate_zones ORDER BY name').all();
      return reply.code(200).send({ zones });
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to fetch climate zones' });
    }
  });
}

module.exports = subscriberRoutes;
