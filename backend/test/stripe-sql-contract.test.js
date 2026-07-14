const assert = require('node:assert/strict');
const test = require('node:test');

const {
  VOXA_STRIPE_EVENT_MARK_SQL,
  VOXA_SUBSCRIPTION_RECONCILE_SQL,
} = require('../dist/routes/stripe');

function assertEveryReferenceHasCast(sql, parameter, castPattern) {
  const references = sql.match(new RegExp(`\\$${parameter}(?!\\d)`, 'g')) ?? [];
  const typedReferences = sql.match(new RegExp(`\\$${parameter}\\s*::\\s*${castPattern}`, 'gi')) ?? [];
  assert.ok(references.length > 0, `expected $${parameter} in SQL`);
  assert.equal(typedReferences.length, references.length, `every $${parameter} reference must have an explicit cast`);
}

test('event receipt status has one PostgreSQL type across SET and CASE', () => {
  assertEveryReferenceHasCast(VOXA_STRIPE_EVENT_MARK_SQL, 2, 'VARCHAR\\s*\\(\\s*20\\s*\\)');
  assert.match(VOXA_STRIPE_EVENT_MARK_SQL, /processed_at\s*=\s*CASE\s+WHEN/i);
});

test('subscription reconciliation keeps typed ordering and same-second downgrade guards', () => {
  assertEveryReferenceHasCast(VOXA_SUBSCRIPTION_RECONCILE_SQL, 3, 'VARCHAR\\s*\\(\\s*50\\s*\\)');
  assertEveryReferenceHasCast(VOXA_SUBSCRIPTION_RECONCILE_SQL, 9, 'TIMESTAMPTZ');
  assert.match(VOXA_SUBSCRIPTION_RECONCILE_SQL, /subscription_provider_updated_at\s+IS\s+NULL/i);
  assert.match(VOXA_SUBSCRIPTION_RECONCILE_SQL, /subscription_provider_updated_at\s*<\s*\$9::TIMESTAMPTZ/i);
  assert.match(VOXA_SUBSCRIPTION_RECONCILE_SQL, /subscription_provider_updated_at\s*=\s*\$9::TIMESTAMPTZ/i);
  assert.match(VOXA_SUBSCRIPTION_RECONCILE_SQL, /subscription_status\s+IN\s*\('active',\s*'trialing'\).*\$3::VARCHAR\(50\)\s+IN\s*\('past_due',\s*'unpaid'\)/is);
});
