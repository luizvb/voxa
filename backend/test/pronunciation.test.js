const assert = require('node:assert/strict');
const test = require('node:test');

const {
  aggregateContinuousPronunciationResults,
  alignPronunciationWords,
  assessEnglishPronunciation,
  detectPossibleFillers,
  inspectPronunciationWav,
  parseAzurePronunciationResponse,
  pronunciationAssessmentModeForDuration,
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

test('pronunciation WAV validation accepts mono 16 kHz PCM through exactly 120 seconds', () => {
  const audio = pcmWav({ durationMs: 1250 });
  const metadata = inspectPronunciationWav(audio);
  assert.equal(metadata.channels, 1);
  assert.equal(metadata.sampleRate, 16000);
  assert.equal(Math.round(metadata.durationMs), 1250);
  assert.equal(pronunciationAudioHash(audio).length, 64);
  assert.throws(() => inspectPronunciationWav(pcmWav({ channels: 2 })), /mono, 16 kHz/);
  assert.equal(Math.round(inspectPronunciationWav(pcmWav({ durationMs: 30000 })).durationMs), 30000);
  const maximumAudio = pcmWav({ durationMs: 120000 });
  assert.equal(Math.round(inspectPronunciationWav(maximumAudio).durationMs), 120000);
  assert.ok(maximumAudio.length < 4 * 1024 * 1024);
  assert.throws(() => inspectPronunciationWav(pcmWav({ durationMs: 120001 })), /0.1 and 120 seconds/);
});

test('assessment mode changes only above the 30 second boundary', () => {
  assert.equal(pronunciationAssessmentModeForDuration(30000), 'single-shot');
  assert.equal(pronunciationAssessmentModeForDuration(30000.01), 'continuous');
  assert.equal(pronunciationAssessmentModeForDuration(120000), 'continuous');
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
        Offset: 1500000,
        Duration: 2000000,
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
    offsetMs: 150,
    durationMs: 200,
    phonemes: [{ phoneme: 'h', accuracyScore: 48 }],
  });
  assert.equal(result.assessmentMode, 'single-shot');
  assert.deepEqual(result.possibleFillers, { totalCount: 0, matches: [] });
  assert.equal(parseAzurePronunciationResponse({
    RecognitionStatus: 'Success',
    NBest: [{ Display: 'Hello.', PronunciationAssessment: { PronScore: null }, Words: [] }],
  }).overallScore, null);
});

function assessedWord(word, offsetMs, accuracyScore = 90) {
  return {
    word,
    accuracyScore,
    errorType: 'None',
    offsetMs,
    durationMs: 100,
    phonemes: [],
  };
}

test('deterministic alignment handles repetitions, punctuation, omissions, and insertions', () => {
  const aligned = alignPronunciationWords('Go, go home now.', [
    assessedWord('go', 0),
    assessedWord('home', 200),
    assessedWord('quickly', 300),
    assessedWord('now', 400),
  ]);
  assert.deepEqual(aligned.map((word) => [word.word, word.errorType]), [
    ['Go', 'Omission'],
    ['go', 'None'],
    ['home', 'None'],
    ['quickly', 'Insertion'],
    ['now', 'None'],
  ]);
  assert.equal(aligned[0].offsetMs, null);
  assert.equal(aligned[3].offsetMs, 300);
});

test('continuous results aggregate scores, offsets, and reference alignment', () => {
  const result = aggregateContinuousPronunciationResults([
    {
      RecognitionStatus: 0,
      NBest: [{
        Display: 'Hello',
        PronunciationAssessment: { FluencyScore: 80, ProsodyScore: 70 },
        Words: [{
          Word: 'Hello',
          Offset: 1000000,
          Duration: 4000000,
          PronunciationAssessment: { AccuracyScore: 90, ErrorType: 'None' },
        }],
      }],
    },
    {
      RecognitionStatus: 'Success',
      NBest: [{
        Display: 'world',
        PronunciationAssessment: { FluencyScore: 84, ProsodyScore: 74 },
        Words: [{
          Word: 'world',
          Offset: 6000000,
          Duration: 3000000,
          PronunciationAssessment: { AccuracyScore: 50, ErrorType: 'None' },
        }],
      }],
    },
  ], 'Hello brave world');

  assert.equal(result.assessmentMode, 'continuous');
  assert.equal(result.recognizedText, 'Hello world');
  assert.deepEqual(result.words.map((word) => [word.word, word.errorType, word.offsetMs]), [
    ['Hello', 'None', 100],
    ['brave', 'Omission', null],
    ['world', 'Mispronunciation', 600],
  ]);
  assert.equal(Math.round(result.accuracyScore), 47);
  assert.equal(Math.round(result.completenessScore), 33);
  assert.deepEqual(result.possibleFillers, { totalCount: 0, matches: [] });
  assert.throws(() => aggregateContinuousPronunciationResults([], 'Hello'), /no pronunciation results/i);
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
  }), /between 1 and 5,000 characters/);
});

test('reference text accepts exactly 5,000 characters and rejects anything longer', async () => {
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify({
      RecognitionStatus: 'Success',
      NBest: [{ Display: 'x', PronunciationAssessment: { PronScore: 90 }, Words: [] }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const audio = pcmWav({ durationMs: 500 });
    await assessEnglishPronunciation({
      audio,
      referenceText: 'x'.repeat(5000),
      apiKey: 'test-key',
      region: 'eastus',
    });
    await assert.rejects(() => assessEnglishPronunciation({
      audio,
      referenceText: 'x'.repeat(5001),
      apiKey: 'test-key',
      region: 'eastus',
    }), /between 1 and 5,000 characters/);
    assert.equal(requests, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test('single-shot provider failures and timeouts are returned without partial results', async () => {
  const originalFetch = global.fetch;
  const audio = pcmWav({ durationMs: 500 });
  try {
    global.fetch = async () => new Response(
      JSON.stringify({ error: { message: 'temporary provider failure' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
    await assert.rejects(() => assessEnglishPronunciation({
      audio,
      referenceText: 'Hello.',
      apiKey: 'test-key',
      region: 'eastus',
    }), /503/);

    global.fetch = async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    };
    await assert.rejects(() => assessEnglishPronunciation({
      audio,
      referenceText: 'Hello.',
      apiKey: 'test-key',
      region: 'eastus',
    }), /timed out/i);
  } finally {
    global.fetch = originalFetch;
  }
});
