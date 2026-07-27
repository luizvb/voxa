const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

test('billing UI discloses approved Voxa Pro amount and entitlement before Checkout', () => {
  const source = readFileSync('src/components/BillingView.tsx', 'utf8');
  const locales = readFileSync('src/i18n/locales.ts', 'utf8');
  assert.match(source, /copy\('price'\)/);
  assert.match(locales, /R\$ 14,90\/month after the trial/);
  assert.match(locales, /sem impostos/);
  assert.match(locales, /provider transcription and AI specialist reports with Pro/);
  assert.match(locales, /Mantenha e leia gravações, transcrições e relatórios após o cancelamento/);
});

test('only provider-funded transcription and AI analysis require Pro', () => {
  const source = readFileSync('backend/src/routes/recordings.ts', 'utf8');
  assert.match(source, /post\('\/:id\/transcribe', requireVoxaPro, transcribeRecording\)/);
  assert.match(source, /post\('\/:id\/analyze', requireVoxaPro, analyzeRecording\)/);
  assert.doesNotMatch(source, /get\([^\n]+requireVoxaPro/);
});

test('billing UI explains no-card trial and required checkout after expiry', () => {
  const source = readFileSync('src/components/BillingView.tsx', 'utf8');
  const app = readFileSync('src/App.tsx', 'utf8');
  const locales = readFileSync('src/i18n/locales.ts', 'utf8');
  const types = readFileSync('src/platform/types.ts', 'utf8');
  assert.match(source, /trialExpiredTitle/);
  assert.match(source, /subscribeContinue/);
  assert.match(locales, /Seu teste de 7 dias terminou/);
  assert.match(locales, /Sua biblioteca continua visível/);
  assert.match(app, /billingGate === 'locked'/);
  assert.match(app, /setShowContentPaywall\(true\)/);
  assert.match(app, /contentLockedTitle/);
  assert.match(types, /trial_active/);
  assert.match(types, /trial_expired/);
});
