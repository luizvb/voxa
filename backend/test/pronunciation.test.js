const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assessEnglishPronunciation,
  detectPossibleFillers,
  inspectPronunciationWav,
  parseAzurePronunciationResponse,
  pronunciationAudioHash,
} = require('../dist/services/pronunciation');

test('possible filler detection handles phrases, elongated spellings, and word boundaries', () => {
  assert.deepEqual(detectPossibleFillers('Um, uhh... erm, hmmm. Like, you know, actually useful.'), {
    totalCount: 7,
    matches: [
      { expression: 'um', count: 1 },
      { expression: 'uh', count: 1 },
      { expression: 'er', count: 1 },
      { expression: 'hmm', count: 1 },
      { expression: 'like', count: 1 },
      { expression: 'you know', count: 1 },
      { expression: 'actually', count: 1 },
    ],
  });
  assert.equal(detectPossibleFillers('The summer theme is here.').totalCount, 0);
});

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
      PronScore: 73.4,
      AccuracyScore: 70,
      FluencyScore: 82,
      CompletenessScore: 100,
      Words: [{
        Word: 'Hello',
        AccuracyScore: 55,
        ErrorType: 'Mispronunciation',
        Phonemes: [{ Phoneme: 'h', AccuracyScore: 48 }],
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
  assert.deepEqual(result.possibleFillers, { totalCount: 0, matches: [] });
  assert.equal(parseAzurePronunciationResponse({
    RecognitionStatus: 'Success',
    NBest: [{ Display: 'Hello.', PronunciationAssessment: { PronScore: null }, Words: [] }],
  }).overallScore, null);
});

test('Azure parser detects possible fillers from detailed word hypotheses', () => {
  const result = parseAzurePronunciationResponse({
    RecognitionStatus: 'Success',
    NBest: [{
      Display: 'I agree.',
      Words: ['Um', 'I', 'actually', 'agree'].map((Word) => ({ Word, AccuracyScore: 90 })),
    }],
  });
  assert.deepEqual(result.possibleFillers, {
    totalCount: 2,
    matches: [
      { expression: 'um', count: 1 },
      { expression: 'actually', count: 1 },
    ],
  });
});

test('Azure parser remains compatible with nested SDK-style assessment fields', () => {
  const result = parseAzurePronunciationResponse({
    RecognitionStatus: 'Success',
    NBest: [{
      Display: 'Hello.',
      PronunciationAssessment: { PronScore: 88, AccuracyScore: 86 },
      Words: [{
        Word: 'Hello',
        PronunciationAssessment: { AccuracyScore: 84, ErrorType: 'None' },
        Phonemes: [{ Phoneme: 'h', PronunciationAssessment: { AccuracyScore: 82 } }],
      }],
    }],
  });
  assert.equal(result.overallScore, 88);
  assert.equal(result.words[0].accuracyScore, 84);
  assert.equal(result.words[0].phonemes[0].accuracyScore, 82);
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
    const result = await assessEnglishPronunciation({
      audio,
      referenceText: 'Um, hello.',
      apiKey: 'test-key',
      region: 'eastus',
    });
    assert.match(captured.url, /^https:\/\/eastus\.stt\.speech\.microsoft\.com\//);
    assert.match(captured.url, /language=en-US/);
    assert.equal(captured.init.body.byteLength, audio.length);
    const configuration = JSON.parse(Buffer.from(captured.init.headers['Pronunciation-Assessment'], 'base64').toString('utf8'));
    assert.equal(configuration.ReferenceText, 'Um, hello.');
    assert.equal(configuration.EnableMiscue, true);
    assert.equal(configuration.EnableProsodyAssessment, true);
    assert.deepEqual(result.possibleFillers, {
      totalCount: 1,
      matches: [{ expression: 'um', count: 1 }],
    });
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
