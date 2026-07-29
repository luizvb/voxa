const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const app = readFileSync('src/App.tsx', 'utf8');
const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
const recorder = readFileSync('src/hooks/useRecorder.ts', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const locales = readFileSync('src/i18n/locales.ts', 'utf8');

test('paid users do not receive an upgrade prompt and account state remains visible', () => {
  assert.match(sidebar, /\['free', 'trial_active', 'trial_expired', 'canceled'\]\.includes/);
  assert.doesNotMatch(sidebar, /\['free', 'trial_active', 'trial_expired', 'canceled', 'active'\]/);
  assert.match(sidebar, /case 'active':[\s\S]*statusPaid/);
  assert.match(sidebar, /className="account-plan-summary"/);
  assert.match(sidebar, /className="account-action account-plan-action"/);
  assert.match(sidebar, /className="account-action account-billing-action"/);
  assert.match(sidebar, /className="account-action account-signout"/);
  assert.match(app, /setBillingStatus\(null\)/);
  assert.match(locales, /Teste grátis/);
  assert.match(locales, /Teste vencido/);
});

test('the recording surface is user-facing and starts with an editable session placeholder', () => {
  assert.match(recorder, /useState\(''\)/);
  assert.doesNotMatch(dashboard, /transcriptionLanguageDescription/);
  assert.doesNotMatch(dashboard, /className="signal-details"/);
  assert.match(locales, /Nome da sessão/);
  assert.match(locales, /Ex\.: Reunião de produto/);
  assert.match(locales, /Idioma da conversa/);
});
