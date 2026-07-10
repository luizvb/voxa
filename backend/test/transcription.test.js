const assert = require('node:assert/strict');
const test = require('node:test');

const { createDeepgramUrl } = require('../dist/services/transcription');

test('Deepgram URL uses only the current diarization model parameter', () => {
  const url = new URL(createDeepgramUrl());

  assert.equal(url.searchParams.get('model'), 'nova-3');
  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('diarize'), null);
  assert.equal(url.searchParams.get('diarize_version'), null);
});

test('max quality preserves diarization and enables richer output', () => {
  const url = new URL(createDeepgramUrl({ maxQuality: true }));

  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('detect_language'), 'true');
  assert.equal(url.searchParams.get('paragraphs'), 'true');
  assert.equal(url.searchParams.get('utterances'), 'true');
});
