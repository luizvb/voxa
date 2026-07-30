import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landing = readFileSync(new URL('../src/components/LandingPage.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const metadata = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the public web entry sells one simple two-step journey', () => {
  assert.match(landing, /Só dois passos/);
  assert.match(landing, /Grave uma conversa/);
  assert.match(landing, /Veja tudo em um só lugar/);
  assert.match(landing, /Testar o Voxa na web/);
  assert.match(landing, /Grave uma conversa/);
  assert.doesNotMatch(landing, /download\s+(?:o|a|do|da)\s+Voxa/i);
});

test('the landing page demonstrates grounded English feedback for both audiences', () => {
  assert.match(landing, /Exemplo de análise/);
  assert.match(landing, /Pronúncia/);
  assert.match(landing, /Sotaque e clareza/);
  assert.match(landing, /Para professores/);
  assert.match(landing, /Para quem aprende/);
  assert.match(landing, /B2 estimado/);
  assert.match(landing, /Nível CEFR/);
  assert.match(landing, /Pronúncia e sotaque/);
  assert.match(landing, /Insights \+ plano/);
  assert.equal(landing.match(/<TranscriptProduct copy=/g)?.length, 1);
  assert.equal(landing.match(/<InsightProduct copy=/g)?.length, 1);
});

test('the landing follows the browser language with complete Portuguese and English copy', () => {
  assert.match(landing, /language === 'pt' \? 'pt' : 'en'/);
  assert.match(landing, /Your English,/);
  assert.match(landing, /Pronunciation and accent/);
  assert.match(landing, /Test Voxa on the web/);
  assert.match(landing, /For learners/);
  assert.match(landing, /For teachers/);
  assert.doesNotMatch(landing, /setLanguage\('pt'\)/);
});

test('the landing is web-only and preserves the authenticated and desktop product', () => {
  assert.match(app, /!isAuthenticated && !isElectronApp/);
  assert.match(app, /<LandingPage/);
  assert.match(metadata, /Feedback de inglês a partir de conversas reais/);
  assert.match(metadata, /transcrição, feedback de pronúncia/);
});
