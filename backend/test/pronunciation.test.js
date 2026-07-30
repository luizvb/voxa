const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assessEnglishPronunciation,
  inspectPronunciationWav,
  parseAzurePronunciationResponse,
  pronunciationAudioHash,
} = require('../dist/services/pronunciation');

function pcmWav({ durationMs = 1000, channels = 1, sampleRate = 16000, bitsPerSample = 16 } = {}) {
  const bytesPerSample = bitsPerSample / 8;
  const dataBytes = Math.round((durationMs / 1000) * sampleRate) * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}

test('pronunciation WAV validation accepts only short mono 16 kHz PCM', () => {
  const audio = pcmWav({ durationMs: 1250 });
  const metadata = inspectPronunciationWav(audio);
  assert.equal(metadata.channels, 1);
  assert.equal(metadata.sampleRate, 16000);
  assert.equal(Math.round(metadata.durationMs), 1250);
  assert.equal(pronunciationAudioHash(audio).length, 64);
  assert.throws(() => inspectPronunciationWav(pcmWav({ channels: 2 })), /mono, 16 kHz/);
  assert.throws(() => inspectPronunciationWav(pcmWav({ durationMs: 30001 })), /0.1 and 30 seconds/);
});

test('Azure detailed response is normalized without inventing missing scores', () => {
  const result = parseAzurePronunciationResponse({
    RecognitionStatus: 'Success',
    NBest: [{
      Display: 'Hello world.',
      PronunciationAssessment: {
        PronScore: 73.4,
        AccuracyScore: 70,
        FluencyScore: 82,
        CompletenessScore: 100,
      },
      Words: [{
        Word: 'Hello',
        PronunciationAssessment: { AccuracyScore: 55, ErrorType: 'Mispronunciation' },
        Phonemes: [{ Phoneme: 'h', PronunciationAssessment: { AccuracyScore: 48 } }],
      }],
    }],
  });
  assert.equal(result.overallScore, 73.4);
  assert.equal(result.prosodyScore, null);
  assert.deepEqual(result.words[0], {
    word: 'Hello',
    accuracyScore: 55,
    errorType: 'Mispronunciation',
    phonemes: [{ phoneme: 'h', accuracyScore: 48 }],
  });
  assert.equal(parseAzurePronunciationResponse({
    RecognitionStatus: 'Success',
    NBest: [{ Display: 'Hello.', PronunciationAssessment: { PronScore: null }, Words: [] }],
  }).overallScore, null);
});

test('Azure request sends the reference text and only the supplied WAV clip', async () => {
  const originalFetch = global.fetch;
  let captured;
  global.fetch = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify({
      RecognitionStatus: 'Success',
      NBest: [{ Display: 'Hello.', PronunciationAssessment: { PronScore: 90 }, Words: [] }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const audio = pcmWav({ durationMs: 500 });
    await assessEnglishPronunciation({
      audio,
      referenceText: 'Hello.',
      apiKey: 'test-key',
      region: 'eastus',
    });
    assert.match(captured.url, /^https:\/\/eastus\.stt\.speech\.microsoft\.com\//);
    assert.match(captured.url, /language=en-US/);
    assert.equal(captured.init.body.byteLength, audio.length);
    const configuration = JSON.parse(Buffer.from(captured.init.headers['Pronunciation-Assessment'], 'base64').toString('utf8'));
    assert.equal(configuration.ReferenceText, 'Hello.');
    assert.equal(configuration.EnableMiscue, true);
    assert.equal(configuration.EnableProsodyAssessment, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Azure request rejects unsafe endpoints and invalid reference text before sending audio', async () => {
  const audio = pcmWav({ durationMs: 500 });
  await assert.rejects(() => assessEnglishPronunciation({
    audio,
    referenceText: 'Hello.',
    apiKey: 'test-key',
    endpoint: 'http://localhost:8080',
  }), /must use HTTPS/);
  await assert.rejects(() => assessEnglishPronunciation({
    audio,
    referenceText: ' ',
    apiKey: 'test-key',
    region: 'eastus',
  }), /between 1 and 2,000 characters/);
});
