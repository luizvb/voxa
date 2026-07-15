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
