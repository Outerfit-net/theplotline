/**
 * Subscriber routes
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');

const { geocode } = require('../services/geocode');
const { getStationInfo } = require('../services/nws');
const { sendConfirmationEmail } = require('../services/email');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'plotlines.db');

function getDb() {
  return new Database(DB_PATH);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function subscriberRoutes(fastify) {
  /**
   * POST /api/subscribe
   * Create a new subscriber
   */
  fastify.post('/subscribe', async (request, reply) => {
    const { email, city, state, author = 'hemingway' } = request.body;

    if (!email || !city || !state) {
      return reply.code(400).send({
        error: 'Missing required fields: email, city, state'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    const db = getDb();

    try {
      // Check if email already exists
      const existing = db.prepare('SELECT id, active, confirmed_at FROM subscribers WHERE email = ?').get(email);

      if (existing) {
        if (existing.active && existing.confirmed_at) {
          return reply.code(409).send({
            error: 'Email already subscribed',
            message: 'This email is already subscribed to Plot Lines.'
          });
        }

        // Reactivate if unsubscribed
        if (!existing.active) {
          const confirmToken = generateToken();
          const unsubscribeToken = generateToken();

          db.prepare(`
            UPDATE subscribers
            SET active = 1, unsubscribed_at = NULL,
                confirm_token = ?, unsubscribe_token = ?,
                location_city = ?, location_state = ?, author_key = ?
            WHERE id = ?
          `).run(confirmToken, unsubscribeToken, city, state, author, existing.id);

          await sendConfirmationEmail(email, confirmToken);

          return reply.code(200).send({
            message: 'Subscription reactivated. Please check your email to confirm.'
          });
        }

        // Resend confirmation if not confirmed
        const confirmToken = generateToken();
        db.prepare('UPDATE subscribers SET confirm_token = ? WHERE id = ?').run(confirmToken, existing.id);
        await sendConfirmationEmail(email, confirmToken);

        return reply.code(200).send({
          message: 'Confirmation email resent. Please check your inbox.'
        });
      }

      // Geocode location
      let lat = null, lon = null, stationCode = null;

      try {
        const geo = await geocode(city, state);
        if (geo) {
          lat = geo.lat;
          lon = geo.lon;

          // Get NWS station
          const station = await getStationInfo(lat, lon);
          if (station) {
            stationCode = station.gridId; // Use forecast office as station code
          }
        }
      } catch (geoErr) {
        console.error('Geocoding error:', geoErr.message);
        // Continue without geocoding - can be fixed later
      }

      // Generate tokens
      const id = uuidv4();
      const confirmToken = generateToken();
      const unsubscribeToken = generateToken();

      // Insert subscriber
      db.prepare(`
        INSERT INTO subscribers (
          id, email, location_city, location_state, author_key,
          station_code, confirm_token, unsubscribe_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, email, city, state, author, stationCode, confirmToken, unsubscribeToken);

      // Create or get combination for this station + author
      if (stationCode) {
        const existingCombo = db.prepare(
          'SELECT id FROM combinations WHERE station_code = ? AND author_key = ?'
        ).get(stationCode, author);

        if (!existingCombo) {
          db.prepare(`
            INSERT INTO combinations (id, station_code, author_key, location_city, location_state, lat, lon)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), stationCode, author, city, state, lat, lon);
        }
      }

      // Send confirmation email
      await sendConfirmationEmail(email, confirmToken);

      db.close();

      return reply.code(201).send({
        message: 'Subscription created. Please check your email to confirm.',
        id
      });

    } catch (err) {
      db.close();
      console.error('Subscribe error:', err);
      return reply.code(500).send({ error: 'Failed to create subscription' });
    }
  });

  /**
   * GET /api/confirm/:token
   * Confirm email subscription
   */
  fastify.get('/confirm/:token', async (request, reply) => {
    const { token } = request.params;
    const db = getDb();

    try {
      const subscriber = db.prepare(
        'SELECT id, email, confirmed_at FROM subscribers WHERE confirm_token = ?'
      ).get(token);

      if (!subscriber) {
        return reply.code(404).send({ error: 'Invalid confirmation token' });
      }

      if (subscriber.confirmed_at) {
        return reply.code(200).send({
          message: 'Email already confirmed',
          email: subscriber.email
        });
      }

      // Confirm the subscription
      db.prepare(`
        UPDATE subscribers
        SET confirmed_at = datetime('now'), confirm_token = NULL
        WHERE id = ?
      `).run(subscriber.id);

      db.close();

      // Redirect to success page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return reply.redirect(`${clientUrl}?confirmed=true`);

    } catch (err) {
      db.close();
      console.error('Confirm error:', err);
      return reply.code(500).send({ error: 'Failed to confirm subscription' });
    }
  });

  /**
   * POST /api/unsubscribe
   * GET /api/unsubscribe?token=xxx
   * Unsubscribe by token
   */
  fastify.get('/unsubscribe', async (request, reply) => {
    const { token } = request.query;
    return handleUnsubscribe(token, reply);
  });

  fastify.post('/unsubscribe', async (request, reply) => {
    const { token } = request.body;
    return handleUnsubscribe(token, reply);
  });

  async function handleUnsubscribe(token, reply) {
    if (!token) {
      return reply.code(400).send({ error: 'Missing unsubscribe token' });
    }

    const db = getDb();

    try {
      const subscriber = db.prepare(
        'SELECT id, email FROM subscribers WHERE unsubscribe_token = ?'
      ).get(token);

      if (!subscriber) {
        return reply.code(404).send({ error: 'Invalid unsubscribe token' });
      }

      // Unsubscribe
      db.prepare(`
        UPDATE subscribers
        SET active = 0, unsubscribed_at = datetime('now')
        WHERE id = ?
      `).run(subscriber.id);

      db.close();

      return reply.code(200).send({
        message: 'Successfully unsubscribed',
        email: subscriber.email
      });

    } catch (err) {
      db.close();
      console.error('Unsubscribe error:', err);
      return reply.code(500).send({ error: 'Failed to unsubscribe' });
    }
  }
}

module.exports = subscriberRoutes;
