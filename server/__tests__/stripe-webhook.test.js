/**
 * Tests for Stripe webhook handler and checkout flow
 */

const { test, expect, describe, beforeEach, afterEach } = require('@jest/globals');
const { initTestDb } = require('./setup');
const { v4: uuidv4 } = require('uuid');

function getTestDb() {
  return initTestDb(':memory:');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSubscriber(db, overrides = {}) {
  const id = uuidv4();
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const token = uuidv4();

  db.prepare(`
    INSERT INTO subscribers (
      id, email, unsubscribe_token, plan, subscription_status,
      subscription_end_date, stripe_customer_id, stripe_subscription_id,
      active, confirmed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).run(
    overrides.id || id,
    overrides.email || email,
    overrides.token || token,
    overrides.plan || 'monthly',
    overrides.status || 'active',
    overrides.end_date || '2026-04-15',
    overrides.stripe_customer_id || `cus_${id}`,
    overrides.stripe_sub_id || `sub_${id}`
  );

  return { id: overrides.id || id, email: overrides.email || email, token: overrides.token || token };
}

// ── Simulate the webhook DB logic inline (no HTTP) ────────────────────────

function handleCheckoutCompleted(db, session) {
  const { subscriberId, plan } = session.metadata || {};
  if (!subscriberId) return;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (plan === 'monthly' ? 30 : 7));

  db.prepare(`
    UPDATE subscribers
    SET stripe_customer_id = ?,
        stripe_subscription_id = ?,
        plan = ?,
        subscription_status = ?,
        subscription_end_date = ?
    WHERE id = ?
  `).run(
    session.customer,
    session.subscription,
    plan,
    'active',
    endDate.toISOString().split('T')[0],
    subscriberId
  );
}

function handleInvoicePaid(db, invoice) {
  const sub = db.prepare('SELECT id, plan FROM subscribers WHERE stripe_customer_id = ?').get(invoice.customer);
  if (!sub) return;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (sub.plan === 'monthly' ? 30 : 7));

  db.prepare('UPDATE subscribers SET subscription_end_date = ? WHERE id = ?')
    .run(endDate.toISOString().split('T')[0], sub.id);
}

function handleInvoicePaymentFailed(db, invoice) {
  db.prepare('UPDATE subscribers SET subscription_status = ? WHERE stripe_customer_id = ?')
    .run('past_due', invoice.customer);
}

function handleSubscriptionDeleted(db, subscription) {
  db.prepare('UPDATE subscribers SET subscription_status = ? WHERE stripe_customer_id = ?')
    .run('canceled', subscription.customer);
}

function handleReferralReward(db, referralCode, newSubscriberId) {
  const referral = db.prepare(`
    SELECT r.id, r.referrer_id FROM referrals r
    WHERE r.code = ? AND r.redeemed_at IS NULL
    LIMIT 1
  `).get(referralCode);

  if (!referral) return false;

  db.prepare(`UPDATE referrals SET redeemed_at = datetime('now'), reward_applied_at = datetime('now') WHERE id = ?`)
    .run(referral.id);

  return true;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Stripe Webhook: checkout.session.completed', () => {
  let db;
  beforeEach(() => { db = getTestDb(); });
  afterEach(() => { if (db) db.close(); });

  test('activates subscriber after checkout', () => {
    const sub = makeSubscriber(db, { status: 'unconfirmed', stripe_customer_id: null, stripe_sub_id: null });

    handleCheckoutCompleted(db, {
      customer: 'cus_newcustomer',
      subscription: 'sub_newsubscription',
      metadata: { subscriberId: sub.id, plan: 'monthly' },
    });

    const result = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(sub.id);
    expect(result.stripe_customer_id).toBe('cus_newcustomer');
    expect(result.stripe_subscription_id).toBe('sub_newsubscription');
    expect(result.subscription_status).toBe('active');
    expect(result.plan).toBe('monthly');
    expect(result.subscription_end_date).toBeTruthy();
  });

  test('sets weekly plan end date to +7 days', () => {
    const sub = makeSubscriber(db);
    const before = new Date();

    handleCheckoutCompleted(db, {
      customer: 'cus_weekly',
      subscription: 'sub_weekly',
      metadata: { subscriberId: sub.id, plan: 'weekly' },
    });

    const result = db.prepare('SELECT subscription_end_date FROM subscribers WHERE id = ?').get(sub.id);
    const endDate = new Date(result.subscription_end_date);
    const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  test('sets monthly plan end date to +30 days', () => {
    const sub = makeSubscriber(db);
    const before = new Date();

    handleCheckoutCompleted(db, {
      customer: 'cus_monthly',
      subscription: 'sub_monthly',
      metadata: { subscriberId: sub.id, plan: 'monthly' },
    });

    const result = db.prepare('SELECT subscription_end_date FROM subscribers WHERE id = ?').get(sub.id);
    const endDate = new Date(result.subscription_end_date);
    const diffDays = Math.round((endDate - before) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(30);
  });

  test('no-ops if subscriberId missing from metadata', () => {
    const sub = makeSubscriber(db, { status: 'unconfirmed' });

    handleCheckoutCompleted(db, {
      customer: 'cus_orphan',
      subscription: 'sub_orphan',
      metadata: {},
    });

    const result = db.prepare('SELECT subscription_status FROM subscribers WHERE id = ?').get(sub.id);
    expect(result.subscription_status).toBe('unconfirmed'); // unchanged
  });
});

describe('Stripe Webhook: invoice.paid', () => {
  let db;
  beforeEach(() => { db = getTestDb(); });
  afterEach(() => { if (db) db.close(); });

  test('extends subscription_end_date on renewal', () => {
    const customerId = `cus_${uuidv4()}`;
    const sub = makeSubscriber(db, {
      stripe_customer_id: customerId,
      plan: 'monthly',
      end_date: '2026-03-01', // old date
    });

    handleInvoicePaid(db, { customer: customerId });

    const result = db.prepare('SELECT subscription_end_date FROM subscribers WHERE id = ?').get(sub.id);
    expect(result.subscription_end_date).not.toBe('2026-03-01');
    expect(new Date(result.subscription_end_date) > new Date('2026-03-01')).toBe(true);
  });

  test('no-ops for unknown customer', () => {
    // should not throw
    expect(() => handleInvoicePaid(db, { customer: 'cus_unknown_xyz' })).not.toThrow();
  });
});

describe('Stripe Webhook: invoice.payment_failed', () => {
  let db;
  beforeEach(() => { db = getTestDb(); });
  afterEach(() => { if (db) db.close(); });

  test('marks subscriber as past_due', () => {
    const customerId = `cus_${uuidv4()}`;
    makeSubscriber(db, { stripe_customer_id: customerId, status: 'active' });

    handleInvoicePaymentFailed(db, { customer: customerId });

    const result = db.prepare('SELECT subscription_status FROM subscribers WHERE stripe_customer_id = ?').get(customerId);
    expect(result.subscription_status).toBe('past_due');
  });
});

describe('Stripe Webhook: customer.subscription.deleted', () => {
  let db;
  beforeEach(() => { db = getTestDb(); });
  afterEach(() => { if (db) db.close(); });

  test('marks subscriber as canceled', () => {
    const customerId = `cus_${uuidv4()}`;
    makeSubscriber(db, { stripe_customer_id: customerId, status: 'active' });

    handleSubscriptionDeleted(db, { customer: customerId });

    const result = db.prepare('SELECT subscription_status FROM subscribers WHERE stripe_customer_id = ?').get(customerId);
    expect(result.subscription_status).toBe('canceled');
  });
});

describe('Referral reward on checkout', () => {
  let db;
  beforeEach(() => { db = getTestDb(); });
  afterEach(() => { if (db) db.close(); });

  test('marks referral as redeemed after successful checkout', () => {
    const referrer = makeSubscriber(db);
    const referee = makeSubscriber(db);
    const code = 'REF-TESTCODE';

    db.prepare(`INSERT INTO referrals (id, referrer_id, code, created_at) VALUES (?, ?, ?, datetime('now'))`)
      .run(uuidv4(), referrer.id, code);

    const result = handleReferralReward(db, code, referee.id);
    expect(result).toBe(true);

    const referral = db.prepare('SELECT redeemed_at FROM referrals WHERE code = ?').get(code);
    expect(referral.redeemed_at).toBeTruthy();
  });

  test('does not double-redeem a referral code', () => {
    const referrer = makeSubscriber(db);
    const code = 'REF-ONCE';

    db.prepare(`INSERT INTO referrals (id, referrer_id, code, redeemed_at, created_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(uuidv4(), referrer.id, code);

    const result = handleReferralReward(db, code, uuidv4());
    expect(result).toBe(false);
  });

  test('returns false for unknown referral code', () => {
    const result = handleReferralReward(db, 'REF-DOESNOTEXIST', uuidv4());
    expect(result).toBe(false);
  });
});
