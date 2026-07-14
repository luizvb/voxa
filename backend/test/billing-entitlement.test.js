const assert = require('node:assert/strict');
const test = require('node:test');

const db = require('../dist/config/db').default;
const { requireVoxaPro, VOXA_ENTITLEMENT_SELECT, voxaProEntitlement } = require('../dist/billing/entitlement');

const now = new Date('2026-07-14T12:00:00Z');

test('Voxa Pro permits provider work only from authoritative paid local states', () => {
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'active' }, now), { normalizedState: 'active', allowed: true });
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'trialing' }, now), { normalizedState: 'trialing', allowed: true });
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'active', cancel_at_period_end: true }, now), { normalizedState: 'cancel_scheduled', allowed: true });
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'past_due', grace_until: '2026-07-15T12:00:00Z' }, now), { normalizedState: 'past_due_grace', allowed: true });
});

test('Voxa Pro fails closed outside grace while preserving read/history routes', () => {
  assert.equal(voxaProEntitlement(undefined, now).allowed, false);
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'past_due', grace_until: '2026-07-13T12:00:00Z' }, now), { normalizedState: 'past_due_blocked', allowed: false });
  assert.equal(voxaProEntitlement({ subscription_status: 'canceled' }, now).allowed, false);
  assert.equal(voxaProEntitlement({ subscription_status: 'active', billing_reconciliation_required: true }, now).allowed, false);
});

test('Voxa Pro entitlement query aliases the physical lifecycle columns to the domain contract', () => {
  assert.match(VOXA_ENTITLEMENT_SELECT, /subscription_cancel_at_period_end\s+AS\s+cancel_at_period_end/i);
  assert.match(VOXA_ENTITLEMENT_SELECT, /subscription_grace_until\s+AS\s+grace_until/i);
});

test('Free users receive VOXA_PRO_REQUIRED without calling a provider', async () => {
  const originalQuery = db.query;
  const queries = [];
  db.query = async (text, params) => {
    queries.push({ text, params });
    return { rows: [{ subscription_status: null }] };
  };

  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  try {
    await requireVoxaPro({ user: { id: 'user_free_e2e' } }, response, () => {
      nextCalled = true;
    });
  } finally {
    db.query = originalQuery;
  }

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 402);
  assert.equal(response.body.code, 'VOXA_PRO_REQUIRED');
  assert.equal(response.body.billingState, 'free');
  assert.deepEqual(queries, [{ text: VOXA_ENTITLEMENT_SELECT, params: ['user_free_e2e'] }]);
});
