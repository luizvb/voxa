const assert = require('node:assert/strict');
const test = require('node:test');

test('transcript timestamps support minute and hour formats', async () => {
  const { findTranscriptSegmentEnd, parseTranscriptTimestamp } = await import('../src/lib/audio-segment.ts');

  assert.equal(parseTranscriptTimestamp('01:23'), 83);
  assert.equal(parseTranscriptTimestamp('01:02:03'), 3723);
  assert.equal(parseTranscriptTimestamp('02:03.5'), 123.5);
  assert.equal(parseTranscriptTimestamp('not-a-time'), null);
  assert.equal(parseTranscriptTimestamp('01:61'), null);
  assert.equal(findTranscriptSegmentEnd([0, 0, null, 12, 20], 0, 30), 12);
  assert.equal(findTranscriptSegmentEnd([0, 12, null], 1, 30), 30);
});

test('WAV export contains only the requested interleaved audio frames', async () => {
  const { createWavSegment } = await import('../src/lib/audio-segment.ts');
  const channels = [
    Float32Array.from([-1, -0.5, 0, 0.5, 1]),
    Float32Array.from([1, 0.5, 0, -0.5, -1]),
  ];
  const audio = {
    length: 5,
    sampleRate: 2,
    numberOfChannels: 2,
    getChannelData(channel) { return channels[channel]; },
  };

  const wav = createWavSegment(audio, 0.5, 1.5);
  const view = new DataView(await wav.arrayBuffer());

  assert.equal(wav.type, 'audio/wav');
  assert.equal(wav.size, 52);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 2);
  assert.equal(view.getUint32(40, true), 8);
  assert.equal(view.getInt16(44, true), -16384);
  assert.equal(view.getInt16(46, true), 16383);
});

test('pronunciation WAV export downmixes and resamples only the requested clip', async () => {
  const { createPronunciationWavSegment } = await import('../src/lib/audio-segment.ts');
  const sampleRate = 48000;
  const length = sampleRate;
  const channels = [
    Float32Array.from({ length }, (_, index) => index / length),
    Float32Array.from({ length }, (_, index) => -(index / length)),
  ];
  const audio = {
    length,
    sampleRate,
    numberOfChannels: 2,
    getChannelData(channel) { return channels[channel]; },
  };
  const wav = createPronunciationWavSegment(audio, 0.25, 0.75);
  const view = new DataView(await wav.arrayBuffer());
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 16000);
});

test('English transcript segments expose saved pronunciation assessment controls', () => {
  const history = require('node:fs').readFileSync('src/components/HistoryView.tsx', 'utf8');
  const routes = require('node:fs').readFileSync('backend/src/routes/recordings.ts', 'utf8');
  assert.match(history, /transcriptData\.language === 'en-US'/);
  assert.match(history, /createPronunciationWavSegment/);
  assert.match(history, /platform\.assessPronunciation/);
  assert.match(history, /possibleFillers\.matches/);
  assert.match(history, /possibleFillersHint/);
  assert.match(routes, /requireVoxaPro, upload\.single\('audio'\), assessSegmentPronunciation/);
});

test('conversation UI exposes segment playback and download only for timed audio', () => {
  const history = require('node:fs').readFileSync('src/components/HistoryView.tsx', 'utf8');
  const electron = require('node:fs').readFileSync('src/platform/electron-platform.ts', 'utf8');
  const preload = require('node:fs').readFileSync('app/preload.js', 'utf8');

  assert.match(history, /hasAudioSegment/);
  assert.match(history, /playTranscriptSegment/);
  assert.match(history, /downloadTranscriptSegment/);
  assert.match(history, /segmentEndRef/);
  assert.match(electron, /loadRecordingMedia/);
  assert.match(preload, /recordings:media/);
});
