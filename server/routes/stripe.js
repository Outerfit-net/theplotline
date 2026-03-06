/**
 * Stripe routes — checkout and webhook handling, plus referral and gift endpoints
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../services/email');

// Helper to HTML-escape strings for XSS prevention
function htmlEscape(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function stripeRoutes(fastify) {
  // ── GET /api/subscription/status ──────────────────────────────────────────
  fastify.get('/subscription/status', async (request, reply) => {
    const { email, token } = request.query;

    if (!email || !token) {
      return reply.code(400).send({ error: 'Missing required query parameters: email, token' });
    }

    const db = fastify.db;
    try {
      const subscriber = await db.prepare(`
        SELECT
          id, email, plan, subscription_status, subscription_end_date, stripe_subscription_id
        FROM subscribers
        WHERE email = ? AND management_token = ?
        LIMIT 1
      `).get(email, token);

      if (!subscriber) {
        return reply.code(401).send({ error: 'Invalid email or token' });
      }

      return reply.send({
        email: subscriber.email,
        plan: subscriber.plan,
        status: subscriber.subscription_status,
        subscription_end_date: subscriber.subscription_end_date,
        author: subscriber.author_key,
        city: subscriber.location_city,
        state: subscriber.location_state,
        country: subscriber.location_country,
        zipcode: subscriber.zipcode
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch subscription status' });
    }
  });

  // ── POST /api/subscription/cancel ─────────────────────────────────────────
  fastify.post('/subscription/cancel', async (request, reply) => {
    const { email, token } = request.body;

    if (!email || !token) {
      return reply.code(400).send({ error: 'Missing required fields: email, token' });
    }

    const db = fastify.db;
    try {
      const subscriber = await db.prepare(`
        SELECT
          id, email, stripe_subscription_id, subscription_end_date
        FROM subscribers
        WHERE email = ? AND management_token = ?
        LIMIT 1
      `).get(email, token);

      if (!subscriber) {
        return reply.code(401).send({ error: 'Invalid email or token' });
      }

      if (!subscriber.stripe_subscription_id) {
        return reply.code(400).send({ error: 'No active subscription to cancel' });
      }

      // Cancel Stripe subscription FIRST - only update DB if Stripe succeeds
      try {
        await stripe.subscriptions.cancel(subscriber.stripe_subscription_id);
      } catch (stripeError) {
        fastify.log.error('Stripe cancellation error:', stripeError);
        return reply.code(500).send({ error: 'Failed to cancel subscription with Stripe' });
      }

      // Update subscription status in DB only after Stripe succeeds
      await db.prepare(`
        UPDATE subscribers
        SET subscription_status = 'canceled',
            active = NULL,
            cancelled_at = NOW()
        WHERE id = ?
      `).run(subscriber.id);

      return reply.send({
        success: true,
        message: 'Subscription canceled',
        access_continues_until: subscriber.subscription_end_date
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to cancel subscription' });
    }
  });

  // ── GET /api/referral/link ───────────────────────────────────────────────
  fastify.get('/referral/link', async (request, reply) => {
    const { email, token } = request.query;

    if (!email || !token) {
      return reply.code(400).send({ error: 'Missing required query parameters: email, token' });
    }

    const db = fastify.db;
    try {
      const subscriber = await db.prepare(`
        SELECT id, email, plan FROM subscribers
        WHERE email = ? AND management_token = ?
        LIMIT 1
      `).get(email, token);

      if (!subscriber) {
        return reply.code(401).send({ error: 'Invalid email or token' });
      }

      // Referral: if weekly → weekly, if annual/monthly → monthly (max 1 month free)
      const referrerPlan = (subscriber.plan === 'weekly') ? 'weekly' : 'monthly';

      // Check if referral code already exists
      let referralRow = await db.prepare('SELECT code FROM referrals WHERE referrer_id = ?').get(subscriber.id);

      let code;
      if (referralRow) {
        code = referralRow.code;
      } else {
        // Generate new referral code
        code = 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        await db.prepare(`
          INSERT INTO referrals (id, referrer_id, code, created_at)
          VALUES (?, ?, ?, NOW())
        `).run(uuidv4(), subscriber.id, code);
      }

      return reply.send({
        code,
        plan: referrerPlan,
        url: `${process.env.CLIENT_URL}/?ref=${code}&plan=${referrerPlan}`
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate referral link' });
    }
  });

  // ── POST /api/gift ───────────────────────────────────────────────────────
  fastify.post('/gift', async (request, reply) => {
    const { gifterEmail, gifterToken, recipientEmail, plan } = request.body;

    if (!gifterEmail || !gifterToken || !recipientEmail || !plan) {
      return reply.code(400).send({ error: 'Missing required fields: gifterEmail, gifterToken, recipientEmail, plan' });
    }

    if (!['weekly', 'monthly'].includes(plan)) {
      return reply.code(400).send({ error: 'Invalid plan: must be weekly or monthly' });
    }

    // Validate recipient email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return reply.code(400).send({ error: 'Invalid recipient email format' });
    }

    const db = fastify.db;
    try {
      // Verify gifter
      const gifter = await db.prepare(`
        SELECT id, email, subscription_status FROM subscribers
        WHERE email = ? AND management_token = ?
        LIMIT 1
      `).get(gifterEmail, gifterToken);

      if (!gifter) {
        return reply.code(401).send({ error: 'Invalid gifter email or token' });
      }

      // Check gifter has active subscription
      if (gifter.subscription_status !== 'active') {
        return reply.code(403).send({ error: 'Active subscription required to send gifts' });
      }

      // Check rate limit: max 5 gifts per day per subscriber
      const today = new Date().toISOString().split('T')[0];
      const giftCount = await db.prepare(`
        SELECT COUNT(*) as count FROM gifts
        WHERE gifter_id = ? AND date(sent_at) = ?
      `).get(gifter.id, today);

      if (giftCount.count >= 5) {
        return reply.code(429).send({ error: 'Rate limit exceeded: maximum 5 gifts per day' });
      }

      // Create promo code in Stripe (100% off for 1 month)
      const promoCode = `GIFT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      // Get the coupon ID from env
      const couponId = process.env.STRIPE_COUPON_FREE_MONTH;

      try {
        await stripe.promotionCodes.create({
          coupon: couponId,
          code: promoCode,
          max_redemptions: 1,
          metadata: {
            gift: 'true',
            gifter: gifterEmail
          }
        });
      } catch (stripeError) {
        fastify.log.error('Failed to create promo code:', stripeError);
        return reply.code(500).send({ error: 'Failed to create gift code' });
      }

      // Log gift to database
      await db.prepare(`
        INSERT INTO gifts (id, gifter_id, recipient_email, code, sent_at)
        VALUES (?, ?, ?, ?, NOW())
      `).run(uuidv4(), gifter.id, recipientEmail, promoCode);

      // Send gift email
      const gifterName = htmlEscape(gifter.email.split('@')[0]);
      const signupUrl = `${process.env.CLIENT_URL}/?ref=${promoCode}&email=${encodeURIComponent(recipientEmail)}`;

      const giftEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Georgia, serif; background: #faf8f5; padding: 40px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
            h1 { color: #2d4a3e; font-size: 24px; margin-bottom: 16px; }
            p { color: #4a4a4a; line-height: 1.6; }
            .code-box { background: #f5f3f0; border: 2px solid #4a7c59; padding: 20px; text-align: center; margin: 24px 0; border-radius: 4px; }
            .code { font-size: 20px; font-weight: bold; color: #4a7c59; font-family: monospace; letter-spacing: 2px; }
            .button { display: inline-block; background: #4a7c59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #e8e4df; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${process.env.CLIENT_URL}/logo-v4.png" alt="The Plot Line" style="height:70px;width:auto;display:block;margin:0 auto 20px;" />
            <h1>${gifterName} sent you a garden letter 🌱</h1>
            <p>A friend thinks you'd love to receive daily garden conversations delivered to your inbox.</p>
            <p>The Plot Line brings together a cast of fictional gardeners — each with a distinct personality and voice — to discuss the day's topic in the literary style of masters like Hemingway, Morrison, and others. Their conversations are tuned to your local weather and season.</p>
            <p>Here's your gift code:</p>
            <div class="code-box">
              <div class="code">${promoCode}</div>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #888;">100% off your first month</p>
            </div>
            <p><a href="${signupUrl}" class="button">Claim Your Gift</a></p>
            <p style="font-size: 12px; color: #888;">Or use code <strong>${promoCode}</strong> during checkout at theplotline.net</p>
            <div class="footer">
              <p>If you're not interested, you can ignore this email. No hard feelings!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const giftEmailText = `
${gifterName} sent you a garden letter 🌱

A friend thinks you'd love to receive daily garden conversations delivered to your inbox.

The Plot Line brings together a cast of fictional gardeners to discuss the day's topic in the literary style of masters like Hemingway, Morrison, and others.

Your gift code: ${promoCode}
(100% off your first month)

Claim your gift: ${signupUrl}

Or use code ${promoCode} during checkout at theplotline.net

If you're not interested, you can ignore this email.
      `;

      await sendEmail({
        to: recipientEmail,
        subject: `${gifterName} sent you a garden letter 🌱`,
        html: giftEmailHtml,
        text: giftEmailText
      });

      return reply.send({
        success: true,
        code: promoCode,
        message: `Gift sent to ${recipientEmail}`
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to send gift' });
    }
  });

  // ── POST /api/stripe/create-checkout ──────────────────────────────────────
  fastify.post('/stripe/create-checkout', async (request, reply) => {
    const { email, plan, subscriberId, promoCode } = request.body;

    if (!email || !plan) {
      return reply.code(400).send({ error: 'Missing required fields: email, plan' });
    }

    if (!['weekly', 'monthly', 'annual'].includes(plan)) {
      return reply.code(400).send({ error: 'Invalid plan: must be weekly, monthly, or annual' });
    }

    const db = fastify.db;
    try {
      // If promoCode is a referral code (starts with REF-), enforce the referrer's plan
      if (promoCode && promoCode.startsWith('REF-')) {
        const referral = await db.prepare(`
          SELECT r.referrer_id, s.plan
          FROM referrals r
          JOIN subscribers s ON r.referrer_id = s.id
          WHERE r.code = ? AND r.redeemed_at IS NULL
          LIMIT 1
        `).get(promoCode);

        if (referral && referral.plan) {
          // Use referrer's plan
          plan = referral.plan;
        }
      }

      // Look up subscriber by email if no subscriberId provided
      let resolvedSubscriberId = subscriberId;
      if (!resolvedSubscriberId) {
        const sub = await db.prepare('SELECT id FROM subscribers WHERE email = ? LIMIT 1').get(email);
        if (sub) {
          resolvedSubscriberId = sub.id;
        }
      }

      // Get or create Stripe customer
      let stripeCustomerId;
      let customer = await stripe.customers.list({ email, limit: 1 });

      if (customer.data.length > 0) {
        stripeCustomerId = customer.data[0].id;
      } else {
        customer = await stripe.customers.create({ email });
        stripeCustomerId = customer.id;
      }

      // Store Stripe customer ID in DB if subscriber exists
      if (resolvedSubscriberId) {
        await db.prepare('UPDATE subscribers SET stripe_customer_id = ? WHERE id = ?').run(stripeCustomerId, resolvedSubscriberId);
      }

      // Get price ID from environment
      let priceId;
      if (plan === 'weekly') {
        priceId = process.env.STRIPE_PRICE_WEEKLY;
      } else if (plan === 'monthly') {
        priceId = process.env.STRIPE_PRICE_MONTHLY;
      } else if (plan === 'annual') {
        priceId = process.env.STRIPE_PRICE_ANNUAL;
      }

      if (!priceId) {
        return reply.code(500).send({ error: `Missing STRIPE_PRICE_${plan.toUpperCase()}` });
      }

      // Build checkout session options
      const sessionParams = {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/cancel`,
        metadata: {
          subscriberId: resolvedSubscriberId || '',
          plan,
        },
      };

      // Apply promo code if provided
      if (promoCode) {
        try {
          // Look up the promotion code by its code
          const promotionCodes = await stripe.promotionCodes.list({
            code: promoCode,
            limit: 1,
            active: true,
          });

          if (promotionCodes.data.length > 0) {
            sessionParams.discounts = [{
              promotion_code: promotionCodes.data[0].id,
            }];
          }
        } catch (promoError) {
          fastify.log.warn('Failed to apply promo code:', promoError.message);
          // Continue without discount if promo code is invalid
        }
      }

      // Create checkout session
      const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

      return reply.send({ url: checkoutSession.url });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create checkout session' });
    }
  });

  // ── POST /api/webhooks/stripe ────────────────────────────────────────────
  fastify.post('/webhooks/stripe', {
    config: {
      rawBody: true
    }
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!webhookSecret) {
        fastify.log.error('Stripe webhook secret not configured');
        return reply.code(500).send({ error: 'Webhook not configured' });
      }

      if (!request.rawBody) {
        fastify.log.error('No raw body for webhook verification');
        return reply.code(400).send({ error: 'Missing body' });
      }

      // Verify signature using raw body
      event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
    } catch (err) {
      fastify.log.error('Webhook signature verification failed:', err.message);
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    const db = fastify.db;

    try {
      switch (event.type) {
        // ─── Checkout session completed ───────────────────────────────────
        case 'checkout.session.completed': {
          const session = event.data.object;
          const subscriberId = session.metadata?.subscriberId;
          const plan = session.metadata?.plan;
          const ref = session.metadata?.ref;

          if (subscriberId) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (plan === 'annual' ? 365 : plan === 'monthly' ? 30 : 7));

            await db.prepare(`
              UPDATE subscribers
              SET stripe_customer_id = ?,
                  stripe_subscription_id = ?,
                  plan = ?,
                  subscription_status = ?,
                  subscription_end_date = ?,
                  confirmed_at = COALESCE(confirmed_at, NOW()),
                  confirm_token = NULL
              WHERE id = ?
            `).run(
              session.customer,
              session.subscription,
              plan,
              'active',
              endDate.toISOString().split('T')[0],
              subscriberId
            );

            // Handle referral reward if ref was provided in checkout metadata
            if (ref) {
              const referral = await db.prepare(`
                SELECT r.referrer_id, s.stripe_subscription_id
                FROM referrals r
                JOIN subscribers s ON r.referrer_id = s.id
                WHERE r.code = ? AND r.redeemed_at IS NULL
                LIMIT 1
              `).get(ref);

              if (referral && referral.stripe_subscription_id) {
                try {
                  const couponId = process.env.STRIPE_COUPON_FREE_MONTH;
                  // Apply free month coupon to referrer
                  await stripe.subscriptions.update(referral.stripe_subscription_id, {
                    coupon: couponId
                  });

                  // Mark referral as redeemed
                  await db.prepare(`
                    UPDATE referrals
                    SET redeemed_at = NOW(), reward_applied_at = NOW()
                    WHERE code = ?
                  `).run(ref);
                } catch (stripeError) {
                  fastify.log.error('Failed to apply referral reward:', stripeError);
                }
              }
            }
          }
          break;
        }

        // ─── Invoice paid ────────────────────────────────────────────────
        case 'invoice.paid': {
          const invoice = event.data.object;
          const customerId = invoice.customer;

          // Find subscriber by Stripe customer ID
          const subscriber = await db.prepare('SELECT id, plan FROM subscribers WHERE stripe_customer_id = ?').get(customerId);

          if (subscriber) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (subscriber.plan === 'annual' ? 365 : subscriber.plan === 'monthly' ? 30 : 7));

            await db.prepare('UPDATE subscribers SET subscription_end_date = ? WHERE id = ?').run(endDate.toISOString().split('T')[0], subscriber.id);
          }
          break;
        }

        // ─── Invoice payment failed ──────────────────────────────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer;

          await db.prepare('UPDATE subscribers SET subscription_status = ? WHERE stripe_customer_id = ?').run('past_due', customerId);
          break;
        }

        // ─── Subscription deleted ────────────────────────────────────────
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customerId = subscription.customer;

          await db.prepare(`
            UPDATE subscribers
            SET subscription_status = 'canceled',
                active = NULL,
                cancelled_at = NOW()
            WHERE stripe_customer_id = ?
          `).run(customerId);
          break;
        }

        default:
          // Ignore other event types
          break;
      }

      reply.send({ received: true });
    } catch (error) {
      fastify.log.error('Webhook processing error:', error);
      return reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });

  // ── POST /api/subscription/update ─────────────────────────────────────────
  fastify.post('/subscription/update', async (request, reply) => {
    const { email, token, author, city, state, country, zipcode } = request.body;

    if (!email || !token) {
      return reply.code(400).send({ error: 'Missing required fields: email, token' });
    }

    const db = fastify.db;
    try {
      const subscriber = await db.prepare(`
        SELECT id FROM subscribers
        WHERE email = ? AND management_token = ?
        LIMIT 1
      `).get(email, token);

      if (!subscriber) {
        return reply.code(401).send({ error: 'Invalid email or token' });
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      
      if (author !== undefined) {
        updates.push('author_key = ?');
        params.push(author);
      }
      if (city !== undefined) {
        updates.push('location_city = ?');
        params.push(city);
      }
      if (state !== undefined) {
        updates.push('location_state = ?');
        params.push(state);
      }
      if (country !== undefined) {
        updates.push('location_country = ?');
        params.push(country);
      }
      if (zipcode !== undefined) {
        updates.push('zipcode = ?');
        params.push(zipcode);
      }

      if (updates.length > 0) {
        params.push(subscriber.id);
        await db.prepare(`
          UPDATE subscribers SET ${updates.join(', ')} WHERE id = ?
        `).run(...params);
      }

      return reply.send({ success: true, message: 'Settings updated' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update settings' });
    }
  });
}

module.exports = stripeRoutes;
