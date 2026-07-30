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
