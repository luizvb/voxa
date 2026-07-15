const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const { billingDatabaseError } = require('../dist/routes/stripe');

test('billing schema drift returns an actionable service error', () => {
  assert.deepEqual(billingDatabaseError({ code: '42703' }), { statusCode: 503, code: 'BILLING_SCHEMA_OUTDATED' });
  assert.deepEqual(billingDatabaseError({ code: '42P01' }), { statusCode: 503, code: 'BILLING_SCHEMA_OUTDATED' });
  assert.equal(billingDatabaseError({ code: '08006' }), null);
});

test('billing migration is serialized, transactional and verified before Vercel builds', () => {
  const runner = readFileSync('scripts/migrate.mjs', 'utf8');
  const checker = readFileSync('scripts/check-billing-schema.mjs', 'utf8');
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(runner, /pg_advisory_lock/);
  assert.match(runner, /createHash\('sha256'\)/);
  assert.match(runner, /DOTENV_CONFIG_PATH/);
  assert.match(runner, /await client\.query\('BEGIN'\)/);
  assert.match(runner, /await client\.query\('ROLLBACK'\)/);
  assert.match(checker, /missingBillingSchema/);
  assert.equal(manifest.scripts['db:migrate'], 'node scripts/migrate.mjs');
  assert.match(manifest.scripts['vercel-build'], /db:check/);
});

test('automatic trial migration is additive, exact and does not backfill existing users', () => {
  const migration = readFileSync('migrations/20260715_automatic_trials.sql', 'utf8');
  const schema = readFileSync('scripts/billing-schema.mjs', 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS trial_plan_key/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS trial_started_at/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS trial_ends_at/i);
  assert.match(migration, /trial_ends_at\s*=\s*trial_started_at\s*\+\s*INTERVAL '7 days'/i);
  assert.doesNotMatch(migration, /UPDATE\s+users/i);
  assert.match(schema, /'trial_plan_key'/);
  assert.match(schema, /'trial_started_at'/);
  assert.match(schema, /'trial_ends_at'/);
});

test('billing identity migration restores the Stripe columns required by runtime queries', () => {
  const migration = readFileSync('migrations/20260715_billing_identity.sql', 'utf8');
  const schema = readFileSync('scripts/billing-schema.mjs', 'utf8');
  for (const column of ['stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_price_id']) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`, 'i'));
    assert.match(schema, new RegExp(`'${column}'`));
  }
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_uq/i);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_subscription_id_uq/i);
  assert.doesNotMatch(migration, /UPDATE\s+users/i);
});
