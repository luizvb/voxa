import { randomUUID } from 'node:crypto';
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import db, { query } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { assertVoxaPrice, assertVoxaSubscriptionPrice, BillingConfigurationError, voxaCheckoutEventAction, voxaStripeConfig } from '../billing/stripe-config';
import { subscriptionIdFromVoxaInvoice, voxaNormalizedBillingState, voxaPaidAccess, voxaSubscriptionSnapshot } from '../billing/lifecycle';

const router = express.Router();

function stripeClient() {
  const config = voxaStripeConfig();
  return { config, stripe: new Stripe(config.key, { apiVersion: '2026-06-24.dahlia', appInfo: { name: 'Voxa', version: '0.1.1' } }) };
}

function billingErrorResponse(error: unknown, res: Response) {
  if (error instanceof BillingConfigurationError) {
    res.status(error.statusCode).json({ error: error.code });
    return;
  }
  console.error('Stripe billing request failed', { code: String((error as { code?: unknown })?.code ?? 'BILLING_REQUEST_FAILED').slice(0, 80) });
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
}

router.get('/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    let configured = true;
    try { voxaStripeConfig(); } catch { configured = false; }
    const result = await query(
      `SELECT subscription_status, subscription_period_start, subscription_period_end,
              subscription_cancel_at_period_end, subscription_grace_until,
              billing_reconciliation_required, checkout_pending_until,
              stripe_customer_id IS NOT NULL AS portal_available
       FROM users WHERE id = $1`,
      [userId],
    );
    const row = result.rows[0] ?? {};
    const normalizedState = voxaNormalizedBillingState({
      status: row.subscription_status,
      cancelAtPeriodEnd: row.subscription_cancel_at_period_end,
      graceUntil: row.subscription_grace_until,
      checkoutPendingUntil: row.checkout_pending_until,
      reconciliationRequired: row.billing_reconciliation_required,
    });
    res.json({
      configured,
      planKey: normalizedState === 'free' || normalizedState === 'canceled' ? null : 'voxa_pro',
      planLabel: 'Voxa Pro',
      rawStatus: row.subscription_status ?? 'inactive',
      normalizedState,
      paidAccess: voxaPaidAccess(normalizedState),
      currentPeriodStart: row.subscription_period_start ?? null,
      currentPeriodEnd: row.subscription_period_end ?? null,
      cancelAtPeriodEnd: Boolean(row.subscription_cancel_at_period_end),
      graceUntil: row.subscription_grace_until ?? null,
      reconciliationRequired: Boolean(row.billing_reconciliation_required),
      portalAvailable: Boolean(row.portal_available),
    });
  } catch (error) {
    billingErrorResponse(error, res);
  }
});

router.post('/create-checkout-session', express.json(), requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
  let pendingToken: string | undefined;
  try {
    const { config, stripe } = stripeClient();
    const price = await stripe.prices.retrieve(config.priceId, { expand: ['product'] });
    assertVoxaPrice(price, config);
    const client = await db.pool.connect();
    let customerId: string;
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO users(id) VALUES($1) ON CONFLICT (id) DO NOTHING', [userId]);
      const result = await client.query('SELECT stripe_customer_id, stripe_subscription_id, subscription_status, checkout_pending_until FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const current = result.rows[0];
      if (current.stripe_subscription_id && !['canceled', 'incomplete_expired', 'inactive'].includes(current.subscription_status)) throw new BillingConfigurationError('Use the billing portal for the existing subscription.', 409, 'USE_BILLING_PORTAL');
      if (current.checkout_pending_until && new Date(current.checkout_pending_until) > new Date()) throw new BillingConfigurationError('A Checkout is already in progress.', 409, 'CHECKOUT_IN_PROGRESS');
      customerId = current.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({ metadata: { userId, ownerBrand: 'netolabs', productKey: 'voxa' } }, { idempotencyKey: `voxa-customer-${userId}` });
        customerId = customer.id;
      }
      pendingToken = randomUUID();
      await client.query(
        `UPDATE users SET stripe_customer_id = $1, checkout_pending_token = $2,
                checkout_pending_until = NOW() + INTERVAL '40 minutes'
         WHERE id = $3`,
        [customerId, pendingToken, userId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const origin = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    const metadata = { userId, ownerBrand: 'netolabs', productKey: 'voxa' };
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: config.priceId, quantity: 1 }],
      mode: 'subscription', customer: customerId!, client_reference_id: userId,
      success_url: `${origin}/?checkout=success`, cancel_url: `${origin}/?checkout=canceled`,
      metadata, subscription_data: { metadata },
    }, { idempotencyKey: `voxa-checkout-${userId}-${pendingToken}` });
    res.json({ url: session.url });
  } catch (error) {
    if (pendingToken) await query('UPDATE users SET checkout_pending_token = NULL, checkout_pending_until = NULL WHERE id = $1 AND checkout_pending_token = $2', [userId, pendingToken]).catch(() => undefined);
    billingErrorResponse(error, res);
  }
});

router.post('/portal', express.json(), requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { config, stripe } = stripeClient();
    const result = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    const customerId = result.rows[0]?.stripe_customer_id;
    if (!customerId) throw new BillingConfigurationError('No billing account is connected.', 409, 'NO_BILLING_ACCOUNT');
    const origin = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?billing=return`,
      ...(config.portalConfigurationId ? { configuration: config.portalConfigurationId } : {}),
    });
    res.json({ url: session.url });
  } catch (error) {
    billingErrorResponse(error, res);
  }
});

async function claimStripeEvent(event: Stripe.Event) {
  const claimed = await query(
    `INSERT INTO stripe_event_receipts(event_id, event_type, provider_created_at, livemode, status)
     VALUES($1, $2, $3, $4, 'processing')
     ON CONFLICT (event_id) DO UPDATE SET status = 'processing', error_code = NULL, updated_at = NOW()
     WHERE stripe_event_receipts.status = 'failed'
        OR (stripe_event_receipts.status = 'processing' AND stripe_event_receipts.updated_at < NOW() - INTERVAL '5 minutes')
     RETURNING event_id`,
    [event.id, event.type, new Date(event.created * 1_000), event.livemode],
  );
  if (claimed.rowCount) return true;
  const existing = await query('SELECT status FROM stripe_event_receipts WHERE event_id = $1', [event.id]);
  if (existing.rows[0]?.status === 'processed') return false;
  throw new BillingConfigurationError('Stripe event is already being processed.', 503, 'BILLING_EVENT_IN_PROGRESS');
}

export const VOXA_STRIPE_EVENT_MARK_SQL = `UPDATE stripe_event_receipts
     SET status = $2::VARCHAR(20), error_code = $3,
         processed_at = CASE WHEN $2::VARCHAR(20) = 'processed' THEN NOW() ELSE processed_at END,
         updated_at = NOW()
     WHERE event_id = $1`;

async function markStripeEvent(eventId: string, status: 'processed' | 'failed', errorCode?: string) {
  await query(
    VOXA_STRIPE_EVENT_MARK_SQL,
    [eventId, status, errorCode?.slice(0, 80) ?? null],
  );
}

export const VOXA_SUBSCRIPTION_RECONCILE_SQL = `UPDATE users
     SET stripe_customer_id = $1, stripe_subscription_id = $2,
         subscription_status = $3::VARCHAR(50), subscription_price_id = $4,
         subscription_period_start = $5, subscription_period_end = $6,
         subscription_cancel_at_period_end = $7, subscription_grace_until = $8,
         subscription_provider_updated_at = $9::TIMESTAMPTZ, subscription_provider_event_id = $10,
         billing_reconciliation_required = FALSE,
         checkout_pending_token = NULL, checkout_pending_until = NULL
     WHERE id = $11
       AND (subscription_provider_updated_at IS NULL
         OR subscription_provider_updated_at < $9::TIMESTAMPTZ
         OR (subscription_provider_updated_at = $9::TIMESTAMPTZ
           AND NOT (subscription_status IN ('active', 'trialing') AND $3::VARCHAR(50) IN ('past_due', 'unpaid'))))`;

async function reconcileSubscription(subscription: Stripe.Subscription, event: Stripe.Event, fallbackUserId?: string) {
  const config = voxaStripeConfig();
  assertVoxaSubscriptionPrice(subscription, config);
  const userId = subscription.metadata?.userId || fallbackUserId;
  if (!userId) throw new BillingConfigurationError('Voxa subscription user mapping is missing.', 409, 'BILLING_USER_MISMATCH');
  const snapshot = voxaSubscriptionSnapshot(subscription, event.created, Number(process.env.BILLING_GRACE_DAYS ?? 3));
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  await query(
    VOXA_SUBSCRIPTION_RECONCILE_SQL,
    [customerId, subscription.id, snapshot.status, config.priceId, snapshot.periodStart, snapshot.periodEnd, snapshot.cancelAtPeriodEnd, snapshot.graceUntil, snapshot.providerUpdatedAt, event.id, userId],
  );
}

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    if (!webhookSecret || typeof sig !== 'string') throw new BillingConfigurationError('Stripe webhook is not configured.');
    const value = stripeClient(); stripe = value.stripe;
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    if (event.livemode !== value.config.expectedLive) throw new BillingConfigurationError('Stripe event mode does not match the server key.', 400, 'BILLING_MODE_MISMATCH');
  } catch (error) {
    console.error('Stripe webhook rejected', { code: error instanceof BillingConfigurationError ? error.code : 'STRIPE_SIGNATURE_INVALID' });
    res.status(error instanceof BillingConfigurationError ? error.statusCode : 400).json({ error: error instanceof BillingConfigurationError ? error.code : 'STRIPE_SIGNATURE_INVALID' });
    return;
  }

  try {
    if (!await claimStripeEvent(event)) { res.json({ received: true, duplicate: true }); return; }
    const object = event.data.object;
    if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
      const session = object as Stripe.Checkout.Session;
      if (voxaCheckoutEventAction(event.type) === 'no-grant' && session.metadata?.productKey === 'voxa' && session.client_reference_id) {
        await query('UPDATE users SET checkout_pending_token = NULL, checkout_pending_until = NULL WHERE id = $1', [session.client_reference_id]);
      }
    } else {
      let subscriptionId: string | undefined;
      let fallbackUserId: string | undefined;
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = object as Stripe.Checkout.Session;
        if (session.metadata?.ownerBrand !== 'netolabs' || session.metadata?.productKey !== 'voxa') throw new BillingConfigurationError('Checkout does not belong to Voxa.', 409, 'BILLING_PRODUCT_MISMATCH');
        if (event.type === 'checkout.session.async_payment_succeeded' || session.payment_status === 'paid') subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        fallbackUserId = session.client_reference_id ?? session.metadata?.userId;
      } else if (event.type.startsWith('customer.subscription.')) {
        subscriptionId = (object as Stripe.Subscription).id;
      } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
        subscriptionId = subscriptionIdFromVoxaInvoice(object as Stripe.Invoice);
      }
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await reconcileSubscription(subscription, event, fallbackUserId);
      }
    }
    await markStripeEvent(event.id, 'processed');
    res.json({ received: true, duplicate: false });
  } catch (error) {
    await markStripeEvent(event.id, 'failed', String((error as { code?: unknown })?.code ?? 'STRIPE_WEBHOOK_PROCESSING_ERROR')).catch(() => undefined);
    console.error('Stripe webhook processing failed', { eventType: event.type, code: String((error as { code?: unknown })?.code ?? 'STRIPE_WEBHOOK_PROCESSING_ERROR').slice(0, 80) });
    res.status(error instanceof BillingConfigurationError ? error.statusCode : 500).json({ error: error instanceof BillingConfigurationError ? error.code : 'STRIPE_WEBHOOK_PROCESSING_ERROR' });
  }
});

export default router;
