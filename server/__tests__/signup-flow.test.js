/**
 * Tests for subscriber signup, confirmation, cancellation, and reactivation flows.
 * Tests DB operations directly (no HTTP).
 */

const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');
const { assignClimateZone, getHemisphere } = require('../services/climate');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const K = ENC_KEY;
const TEST_PREFIX = 'test-signup-';

function emailHash(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

async function insertSubscriber(db, overrides = {}) {
  const id = overrides.id || uuidv4();
  const email = overrides.email || `${TEST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const hash = emailHash(email);
  const confirmToken = overrides.confirm_token || uuidv4();
  const unsubscribeToken = overrides.unsubscribe_token || uuidv4();

  await db.query(`
    INSERT INTO subscribers (
      id, email, email_hash, confirm_token, unsubscribe_token,
      active, confirmed_at, subscription_status,
      climate_zone_id, hemisphere, station_code, author_key,
      cancelled_at
    ) VALUES (
      $1, pgp_sym_encrypt($2, '${K}'), $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11, $12,
      $13
    )
  `, [
    id, email, hash, confirmToken, unsubscribeToken,
    overrides.active ?? 1,
    overrides.confirmed_at ?? null,
    overrides.subscription_status || 'active',
    overrides.climate_zone_id || null,
    overrides.hemisphere || 'N',
    overrides.station_code || null,
    overrides.author_key || 'hemingway',
    overrides.cancelled_at || null,
  ]);

  return { id, email, hash, confirmToken, unsubscribeToken };
}

describe('Signup Flow', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  // ── 1. Duplicate active email blocked ──────────────────────────────────
  test('duplicate active email is blocked by unique email_hash index', async () => {
    const email = `${TEST_PREFIX}dup@example.com`;
    await insertSubscriber(db, { email, active: 1, confirmed_at: new Date(), subscription_status: 'active' });

    // Attempting to insert another subscriber with the same email_hash should fail
    await expect(
      insertSubscriber(db, { email, active: 1, confirmed_at: new Date(), subscription_status: 'active' })
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  // ── 2. Confirmation sets confirmed_at ──────────────────────────────────
  test('confirmation sets confirmed_at and clears confirm_token', async () => {
    const sub = await insertSubscriber(db, { active: 1, confirmed_at: null });

    // Simulate the confirm route logic
    await db.query(
      "UPDATE subscribers SET confirmed_at=NOW(), subscribed_at=NOW(), confirm_token=NULL WHERE confirm_token=$1",
      [sub.confirmToken]
    );

    const { rows } = await db.query('SELECT confirmed_at, confirm_token FROM subscribers WHERE id = $1', [sub.id]);
    expect(rows[0].confirmed_at).not.toBeNull();
    expect(rows[0].confirm_token).toBeNull();
  });

  // ── 3. Cancel sets active=0 ────────────────────────────────────────────
  test('cancel sets active=0 and unsubscribed_at', async () => {
    const sub = await insertSubscriber(db, { active: 1, confirmed_at: new Date(), subscription_status: 'active' });

    // Simulate the unsubscribe route logic
    await db.query(
      "UPDATE subscribers SET active=0, unsubscribed_at=NOW(), cancelled_at=NOW() WHERE unsubscribe_token=$1",
      [sub.unsubscribeToken]
    );

    const { rows } = await db.query('SELECT active, cancelled_at, unsubscribed_at FROM subscribers WHERE id = $1', [sub.id]);
    expect(rows[0].active).toBe(0);
    expect(rows[0].cancelled_at).not.toBeNull();
    expect(rows[0].unsubscribed_at).not.toBeNull();
  });

  // ── 4. Reactivation allowed ────────────────────────────────────────────
  test('reactivation of cancelled subscriber is allowed', async () => {
    const email = `${TEST_PREFIX}reactivate@example.com`;
    await insertSubscriber(db, {
      email,
      active: 0,
      confirmed_at: new Date(),
      subscription_status: 'canceled',
      cancelled_at: new Date(),
    });

    // Simulate the reactivation logic from the subscribe route
    const hash = emailHash(email);
    await db.query(`
      UPDATE subscribers SET active=1, unsubscribed_at=NULL, cancelled_at=NULL,
        confirm_token=$1, unsubscribe_token=$2, subscription_status='active',
        subscribed_at=NOW()
      WHERE email_hash=$3
    `, [uuidv4(), uuidv4(), hash]);

    const { rows } = await db.query('SELECT active, cancelled_at, subscription_status FROM subscribers WHERE email_hash = $1', [hash]);
    expect(rows[0].active).toBe(1);
    expect(rows[0].cancelled_at).toBeNull();
    expect(rows[0].subscription_status).toBe('active');
  });

  // ── 5. Zone assigned on signup ─────────────────────────────────────────
  test('assignClimateZone(40.015, -105.27, US) returns high_plains', () => {
    expect(assignClimateZone(40.015, -105.27, 'US')).toBe('high_plains');
  });

  // ── 6. Hemisphere assigned ─────────────────────────────────────────────
  test('hemisphere: lat < 0 returns S, lat >= 0 returns N', () => {
    expect(getHemisphere(-33)).toBe('S');
    expect(getHemisphere(0)).toBe('N');
    expect(getHemisphere(40)).toBe('N');
  });
});
