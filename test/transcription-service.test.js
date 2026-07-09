const assert = require('node:assert/strict');
const test = require('node:test');

const { createDeepgramUrl, createMarkdown, transcribeWithDeepgram } = require('../app/transcription-service');

test('Deepgram standard quality uses Nova-3 with diarization model', () => {
  const url = new URL(createDeepgramUrl({ maxQuality: false }));

  assert.equal(url.searchParams.get('model'), 'nova-3');
  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('smart_format'), 'true');
  assert.equal(url.searchParams.get('paragraphs'), null);
  assert.equal(url.searchParams.get('utterances'), null);
});

test('Deepgram max quality enables richer transcript features', () => {
  const url = new URL(createDeepgramUrl({ maxQuality: true }));

  assert.equal(url.searchParams.get('paragraphs'), 'true');
  assert.equal(url.searchParams.get('utterances'), 'true');
  assert.equal(url.searchParams.get('detect_language'), 'true');
});

test('transcript markdown preserves speaker labels from utterances', () => {
  const markdown = createMarkdown({
    results: {
      utterances: [
        { speaker: 0, start: 0, transcript: 'Hello there.' },
        { speaker: 1, start: 3, transcript: 'Hi Luiz.' }
      ]
    }
  });

  assert.match(markdown, /\*\*Speaker 0\*\* \(00:00\)/);
  assert.match(markdown, /Hello there\./);
  assert.match(markdown, /\*\*Speaker 1\*\* \(00:03\)/);
});

test('Deepgram transcription fails clearly without an API key', async () => {
  await assert.rejects(
    () => transcribeWithDeepgram({ filePath: '/tmp/missing.webm', apiKey: '' }),
    /Missing DEEPGRAM_API_KEY/
  );
});
