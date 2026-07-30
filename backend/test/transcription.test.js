const assert = require('node:assert/strict');
const test = require('node:test');

const { createDeepgramUrl, createMarkdown, extractTranscriptSegments, normalizeTranscriptionLanguage } = require('../dist/services/transcription');

test('Deepgram URL uses only the current diarization model parameter', () => {
  const url = new URL(createDeepgramUrl());

  assert.equal(url.searchParams.get('model'), 'nova-3');
  assert.equal(url.searchParams.get('language'), 'multi');
  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('utterances'), 'true');
  assert.equal(url.searchParams.get('diarize'), null);
  assert.equal(url.searchParams.get('diarize_version'), null);
});

test('selected Portuguese uses the dedicated Nova-3 language with diarization', () => {
  const url = new URL(createDeepgramUrl({ language: 'pt-BR' }));

  assert.equal(url.searchParams.get('language'), 'pt-BR');
  assert.equal(url.searchParams.get('diarize_model'), 'latest');
  assert.equal(url.searchParams.get('utterances'), 'true');
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

test('utterance markdown merges adjacent fragments from the same speaker into stable turns', () => {
  const markdown = createMarkdown({ results: { utterances: [
    { speaker: 0, start: 0, transcript: 'Bom dia.' },
    { speaker: 0, start: 1, transcript: 'Vamos começar.' },
    { speaker: 1, start: 3, transcript: 'Combinado.' },
    { speaker: 1, start: 4, transcript: 'Eu envio amanhã.' },
    { speaker: 0, start: 7, transcript: 'Perfeito.' },
  ] } });

  assert.equal((markdown.match(/\*\*Speaker 0\*\*/g) || []).length, 2);
  assert.equal((markdown.match(/\*\*Speaker 1\*\*/g) || []).length, 1);
  assert.match(markdown, /Bom dia\. Vamos começar\./);
  assert.match(markdown, /Combinado\. Eu envio amanhã\./);
});

test('utterance segments preserve exact provider boundaries for audio assessment', () => {
  const segments = extractTranscriptSegments({ results: { utterances: [
    { speaker: 0, start: 0.125, end: 1.75, transcript: 'Hello there.' },
    { speaker: 0, start: 1.8, end: 3.025, transcript: 'How are you?' },
  ] } });
  assert.deepEqual(segments, [
    { speaker: 'Speaker 0', text: 'Hello there.', startMs: 125, endMs: 1750 },
    { speaker: 'Speaker 0', text: 'How are you?', startMs: 1800, endMs: 3025 },
  ]);
});
