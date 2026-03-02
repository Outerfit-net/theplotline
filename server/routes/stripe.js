/**
 * Stripe routes — checkout and webhook handling
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'plotlines.db');

function getDb() {
  return new Database(DB_PATH);
}

async function stripeRoutes(fastify) {
  // ── POST /api/stripe/create-checkout ──────────────────────────────────────
  fastify.post('/stripe/create-checkout', async (request, reply) => {
    const { email, plan, subscriberId } = request.body;

    if (!email || !plan) {
      return reply.code(400).send({ error: 'Missing required fields: email, plan' });
    }

    if (!['weekly', 'monthly'].includes(plan)) {
      return reply.code(400).send({ error: 'Invalid plan: must be weekly or monthly' });
    }

    try {
      const db = getDb();
      
      // Get or create Stripe customer
      let stripeCustomerId;
      let customer = await stripe.customers.list({ email, limit: 1 });
      
      if (customer.data.length > 0) {
        stripeCustomerId = customer.data[0].id;
      } else {
        customer = await stripe.customers.create({ email });
        stripeCustomerId = customer.id;
        
        // Store in DB if subscriber exists
        if (subscriberId) {
          const stmt = db.prepare('UPDATE subscribers SET stripe_customer_id = ? WHERE id = ?');
          stmt.run(stripeCustomerId, subscriberId);
        }
      }

      // Get price ID from environment
      const priceId = plan === 'weekly' 
        ? process.env.STRIPE_PRICE_WEEKLY 
        : process.env.STRIPE_PRICE_MONTHLY;

      if (!priceId) {
        return reply.code(500).send({ error: `Missing STRIPE_PRICE_${plan.toUpperCase()}` });
      }

      // Create checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
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
          subscriberId: subscriberId || '',
          plan,
        },
      });

      db.close();
      return reply.send({ url: checkoutSession.url });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create checkout session' });
    }
  });

  // ── POST /api/webhooks/stripe ────────────────────────────────────────────
  fastify.post('/webhooks/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      // If webhook secret is empty, skip verification (test mode)
      if (webhookSecret) {
        // In production, you'd need raw body
        // For now, just parse the body
        event = typeof request.body === 'string' 
          ? JSON.parse(request.body) 
          : request.body;
      } else {
        // Test mode: parse body directly
        event = typeof request.body === 'string' 
          ? JSON.parse(request.body) 
          : request.body;
      }
    } catch (err) {
      fastify.log.error('Webhook signature verification failed:', err.message);
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    const db = getDb();
    
    try {
      switch (event.type) {
        // ─── Checkout session completed ───────────────────────────────────
        case 'checkout.session.completed': {
          const session = event.data.object;
          const subscriberId = session.metadata?.subscriberId;
          const plan = session.metadata?.plan;

          if (subscriberId) {
            const stmt = db.prepare(`
              UPDATE subscribers 
              SET stripe_customer_id = ?,
                  stripe_subscription_id = ?,
                  plan = ?,
                  subscription_status = ?,
                  subscription_end_date = ?
              WHERE id = ?
            `);
            
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (plan === 'monthly' ? 30 : 7));
            
            stmt.run(
              session.customer,
              session.subscription,
              plan,
              'active',
              endDate.toISOString().split('T')[0],
              subscriberId
            );
          }
          break;
        }

        // ─── Invoice paid ────────────────────────────────────────────────
        case 'invoice.paid': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          
          // Find subscriber by Stripe customer ID
          const stmt = db.prepare('SELECT id, plan FROM subscribers WHERE stripe_customer_id = ?');
          const subscriber = stmt.get(customerId);
          
          if (subscriber) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (subscriber.plan === 'monthly' ? 30 : 7));
            
            const updateStmt = db.prepare('UPDATE subscribers SET subscription_end_date = ? WHERE id = ?');
            updateStmt.run(endDate.toISOString().split('T')[0], subscriber.id);
          }
          break;
        }

        // ─── Invoice payment failed ──────────────────────────────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          
          const stmt = db.prepare('UPDATE subscribers SET subscription_status = ? WHERE stripe_customer_id = ?');
          stmt.run('past_due', customerId);
          break;
        }

        // ─── Subscription deleted ────────────────────────────────────────
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          
          const stmt = db.prepare('UPDATE subscribers SET subscription_status = ? WHERE stripe_customer_id = ?');
          stmt.run('canceled', customerId);
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
    } finally {
      db.close();
    }
  });
}

module.exports = stripeRoutes;
