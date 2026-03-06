/**
 * Tests for Stripe webhook handler and checkout flow
 */

const { test, expect, describe, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { getTestDb, resetTestDb, ENC_KEY } = require('./pg-setup');
const { v4: uuidv4 } = require('uuid');

const K = ENC_KEY;

// ── Helpers ────────────────────────────────────────────────────────────────

async function makeSubscriber(db, overrides = {}) {
  const id = overrides.id || uuidv4();
  const email = overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const token = overrides.token || uuidv4();

  await db.query(`
    INSERT INTO subscribers (
      id, email, email_hash, unsubscribe_token, plan, subscription_status,
      subscription_end_date, stripe_customer_id, stripe_subscription_id,
      active, confirmed_at
    ) VALUES ($1, pgp_sym_encrypt($2, '${K}'), encode(digest($2, 'sha256'), 'hex'),
      $3, $4, $5, $6, $7, $8, 1, NOW())
  `, [
    id, email, token,
    overrides.plan || 'monthly',
    overrides.status || 'active',
    overrides.end_date || '2026-04-15',
    overrides.stripe_customer_id || `cus_${id}`,
    overrides.stripe_sub_id || `sub_${id}`
  ]);

  return { id, email, token };
}

// ── Simulate the webhook DB logic inline (no HTTP) ────────────────────────

async function handleCheckoutCompleted(db, session) {
  const { subscriberId, plan } = session.metadata || {};
  if (!subscriberId) return;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (plan === 'monthly' ? 30 : 7));

  await db.query(`
    UPDATE subscribers
    SET stripe_customer_id = $1,
        stripe_subscription_id = $2,
        plan = $3,
        subscription_status = $4,
        subscription_end_date = $5
    WHERE id = $6
  `, [
    session.customer,
    session.subscription,
    plan,
    'active',
    endDate.toISOString().split('T')[0],
    subscriberId
  ]);
}

async function handleInvoicePaid(db, invoice) {
  const { rows } = await db.query('SELECT id, plan FROM subscribers WHERE stripe_customer_id = $1', [invoice.customer]);
  const sub = rows[0];
  if (!sub) return;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (sub.plan === 'monthly' ? 30 : 7));

  await db.query('UPDATE subscribers SET subscription_end_date = $1 WHERE id = $2',
    [endDate.toISOString().split('T')[0], sub.id]);
}

async function handleInvoicePaymentFailed(db, invoice) {
  await db.query('UPDATE subscribers SET subscription_status = $1 WHERE stripe_customer_id = $2',
    ['past_due', invoice.customer]);
}

async function handleSubscriptionDeleted(db, subscription) {
  await db.query('UPDATE subscribers SET subscription_status = $1 WHERE stripe_customer_id = $2',
    ['canceled', subscription.customer]);
}

async function handleReferralReward(db, referralCode, newSubscriberId) {
  const { rows } = await db.query(`
    SELECT r.id, r.referrer_id FROM referrals r
    WHERE r.code = $1 AND r.redeemed_at IS NULL
    LIMIT 1
  `, [referralCode]);

  const referral = rows[0];
  if (!referral) return false;

  await db.query(`UPDATE referrals SET redeemed_at = NOW(), reward_applied_at = NOW() WHERE id = $1`,
    [referral.id]);

  return true;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Stripe Webhook: checkout.session.completed', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('activates subscriber after checkout', async () => {
    const sub = await makeSubscriber(db, { status: 'unconfirmed', stripe_customer_id: null, stripe_sub_id: null });

    await handleCheckoutCompleted(db, {
      customer: 'cus_newcustomer',
      subscription: 'sub_newsubscription',
      metadata: { subscriberId: sub.id, plan: 'monthly' },
    });

    const { rows } = await db.query('SELECT * FROM subscribers WHERE id = $1', [sub.id]);
    const result = rows[0];
    expect(result.stripe_customer_id).toBe('cus_newcustomer');
    expect(result.stripe_subscription_id).toBe('sub_newsubscription');
    expect(result.subscription_status).toBe('active');
    expect(result.plan).toBe('monthly');
    expect(result.subscription_end_date).toBeTruthy();
  });

  test('sets weekly plan end date to +7 days', async () => {
    const sub = await makeSubscriber(db);
    const before = new Date();

    await handleCheckoutCompleted(db, {
      customer: 'cus_weekly',
      subscription: 'sub_weekly',
      metadata: { subscriberId: sub.id, plan: 'weekly' },
    });

    const { rows } = await db.query('SELECT subscription_end_date FROM subscribers WHERE id = $1', [sub.id]);
    const endDate = new Date(rows[0].subscription_end_date);
    const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  test('sets monthly plan end date to +30 days', async () => {
    const sub = await makeSubscriber(db);
    const before = new Date();

    await handleCheckoutCompleted(db, {
      customer: 'cus_monthly',
      subscription: 'sub_monthly',
      metadata: { subscriberId: sub.id, plan: 'monthly' },
    });

    const { rows } = await db.query('SELECT subscription_end_date FROM subscribers WHERE id = $1', [sub.id]);
    const endDate = new Date(rows[0].subscription_end_date);
    const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(30);
  });

  test('no-ops if subscriberId missing from metadata', async () => {
    const sub = await makeSubscriber(db, { status: 'unconfirmed' });

    await handleCheckoutCompleted(db, {
      customer: 'cus_orphan',
      subscription: 'sub_orphan',
      metadata: {},
    });

    const { rows } = await db.query('SELECT subscription_status FROM subscribers WHERE id = $1', [sub.id]);
    expect(rows[0].subscription_status).toBe('unconfirmed');
  });
});

describe('Stripe Webhook: invoice.paid', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('extends subscription_end_date on renewal', async () => {
    const customerId = `cus_${uuidv4()}`;
    const sub = await makeSubscriber(db, {
      stripe_customer_id: customerId,
      plan: 'monthly',
      end_date: '2026-03-01',
    });

    await handleInvoicePaid(db, { customer: customerId });

    const { rows } = await db.query('SELECT subscription_end_date FROM subscribers WHERE id = $1', [sub.id]);
    expect(rows[0].subscription_end_date).not.toBe('2026-03-01');
    expect(new Date(rows[0].subscription_end_date) > new Date('2026-03-01')).toBe(true);
  });

  test('no-ops for unknown customer', async () => {
    await expect(handleInvoicePaid(db, { customer: 'cus_unknown_xyz' })).resolves.not.toThrow();
  });
});

describe('Stripe Webhook: invoice.payment_failed', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('marks subscriber as past_due', async () => {
    const customerId = `cus_${uuidv4()}`;
    await makeSubscriber(db, { stripe_customer_id: customerId, status: 'active' });

    await handleInvoicePaymentFailed(db, { customer: customerId });

    const { rows } = await db.query('SELECT subscription_status FROM subscribers WHERE stripe_customer_id = $1', [customerId]);
    expect(rows[0].subscription_status).toBe('past_due');
  });
});

describe('Stripe Webhook: customer.subscription.deleted', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('marks subscriber as canceled', async () => {
    const customerId = `cus_${uuidv4()}`;
    await makeSubscriber(db, { stripe_customer_id: customerId, status: 'active' });

    await handleSubscriptionDeleted(db, { customer: customerId });

    const { rows } = await db.query('SELECT subscription_status FROM subscribers WHERE stripe_customer_id = $1', [customerId]);
    expect(rows[0].subscription_status).toBe('canceled');
  });
});

describe('Referral reward on checkout', () => {
  let db;
  beforeAll(async () => { db = await getTestDb(); });
  beforeEach(async () => { await resetTestDb(db); });
  afterAll(async () => { if (db) await db.end(); });

  test('marks referral as redeemed after successful checkout', async () => {
    const referrer = await makeSubscriber(db);
    const referee = await makeSubscriber(db);
    const code = 'REF-TESTCODE';

    await db.query(`INSERT INTO referrals (id, referrer_id, code, created_at) VALUES ($1, $2, $3, NOW())`,
      [uuidv4(), referrer.id, code]);

    const result = await handleReferralReward(db, code, referee.id);
    expect(result).toBe(true);

    const { rows } = await db.query('SELECT redeemed_at FROM referrals WHERE code = $1', [code]);
    expect(rows[0].redeemed_at).toBeTruthy();
  });

  test('does not double-redeem a referral code', async () => {
    const referrer = await makeSubscriber(db);
    const code = 'REF-ONCE';

    await db.query(`INSERT INTO referrals (id, referrer_id, code, redeemed_at, created_at) VALUES ($1, $2, $3, NOW(), NOW())`,
      [uuidv4(), referrer.id, code]);

    const result = await handleReferralReward(db, code, uuidv4());
    expect(result).toBe(false);
  });

  test('returns false for unknown referral code', async () => {
    const result = await handleReferralReward(db, 'REF-DOESNOTEXIST', uuidv4());
    expect(result).toBe(false);
  });
});
