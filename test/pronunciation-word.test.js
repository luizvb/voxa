const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('word playback uses Azure-relative offsets with context clamped to the transcript segment', async () => {
  const { getPronunciationWordPlaybackBounds } = await import('../src/lib/pronunciation-word.ts');
  const segment = { startMs: 10000, endMs: 12000 };
  const word = {
    word: 'hello',
    accuracyScore: 55,
    errorType: 'Mispronunciation',
    offsetMs: 50,
    durationMs: 300,
    phonemes: [],
  };
  assert.deepEqual(getPronunciationWordPlaybackBounds(segment, word), {
    startSeconds: 10,
    endSeconds: 10.45,
  });
  assert.deepEqual(getPronunciationWordPlaybackBounds(segment, {
    ...word,
    offsetMs: 1900,
    durationMs: 200,
  }), {
    startSeconds: 11.8,
    endSeconds: 12,
  });
});

test('legacy words and omissions do not expose original audio playback', async () => {
  const { getPronunciationWordPlaybackBounds } = await import('../src/lib/pronunciation-word.ts');
  const segment = { startMs: 0, endMs: 2000 };
  const legacyWord = { word: 'hello', accuracyScore: 55, errorType: 'Mispronunciation', phonemes: [] };
  assert.equal(getPronunciationWordPlaybackBounds(segment, legacyWord), null);
  assert.equal(getPronunciationWordPlaybackBounds(segment, {
    ...legacyWord,
    errorType: 'Omission',
    offsetMs: 100,
    durationMs: 200,
  }), null);
});

test('pronunciation color thresholds preserve red and yellow assessment rules', async () => {
  const { getPronunciationWordLevel } = await import('../src/lib/pronunciation-word.ts');
  const word = (accuracyScore, errorType = 'None') => ({ word: 'test', accuracyScore, errorType, phonemes: [] });
  assert.equal(getPronunciationWordLevel(word(59)), 'is-poor');
  assert.equal(getPronunciationWordLevel(word(60)), 'is-needs-work');
  assert.equal(getPronunciationWordLevel(word(79)), 'is-needs-work');
  assert.equal(getPronunciationWordLevel(word(80)), '');
  assert.equal(getPronunciationWordLevel(word(95, 'Omission')), 'is-poor');
  assert.equal(getPronunciationWordLevel(word(95, 'Mispronunciation')), 'is-poor');
  assert.equal(getPronunciationWordLevel(word(95, 'Insertion')), 'is-needs-work');
  assert.equal(getPronunciationWordLevel(word(95, 'UnexpectedBreak')), 'is-needs-work');
});

test('word controls use renewed consent, accessible popovers, and device TTS without autoplay', () => {
  const history = fs.readFileSync('src/components/HistoryView.tsx', 'utf8');
  const popover = fs.readFileSync('src/components/PronunciationWordPopover.tsx', 'utf8');
  assert.match(history, /voxa_pronunciation_consent_v2/);
  assert.match(history, /utterance\.lang = 'en-US'/);
  assert.match(history, /utterance\.rate = 0\.88/);
  assert.match(popover, /@radix-ui\/react-popover/);
  assert.match(popover, /onEscapeKeyDown/);
  assert.doesNotMatch(popover, /autoPlay/i);
});
