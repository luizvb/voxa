const assert = require('node:assert/strict');
const test = require('node:test');

const { createDeepgramUrl, normalizeTranscriptionLanguage } = require('../dist/services/transcription');

test('Deepgram URL uses only the current diarization model parameter', () => {
  const url = new URL(createDeepgramUrl());

  assert.equal(url.searchParams.get('model'), 'nova-3');
  assert.equal(url.searchParams.get('language'), 'multi');
  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('diarize'), null);
  assert.equal(url.searchParams.get('diarize_version'), null);
});

test('selected Portuguese uses the dedicated Nova-3 language with diarization', () => {
  const url = new URL(createDeepgramUrl({ language: 'pt-BR' }));

  assert.equal(url.searchParams.get('language'), 'pt-BR');
  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('detect_language'), null);
});

test('max quality preserves explicit language and enables richer output', () => {
  const url = new URL(createDeepgramUrl({ maxQuality: true, language: 'es' }));

  assert.equal(url.searchParams.get('language'), 'es');
  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('detect_language'), null);
  assert.equal(url.searchParams.get('paragraphs'), 'true');
  assert.equal(url.searchParams.get('utterances'), 'true');
});

test('transcription language rejects unsupported values and defaults legacy clients to multi', () => {
  assert.equal(normalizeTranscriptionLanguage(undefined), 'multi');
  assert.equal(normalizeTranscriptionLanguage('en-US'), 'en-US');
  assert.equal(normalizeTranscriptionLanguage('pt-BR'), 'pt-BR');
  assert.equal(normalizeTranscriptionLanguage('es'), 'es');
  assert.throws(() => normalizeTranscriptionLanguage('pt'), /Unsupported transcription language/);
});
