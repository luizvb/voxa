import { createHash } from 'node:crypto';

const MAX_CLIP_DURATION_MS = 30_000;
const MIN_CLIP_DURATION_MS = 100;
const REQUIRED_SAMPLE_RATE = 16_000;

export interface WavMetadata {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  durationMs: number;
}

export interface PronunciationWord {
  word: string;
  accuracyScore: number | null;
  errorType: string;
  phonemes: Array<{ phoneme: string; accuracyScore: number | null }>;
}

export interface PossibleFillerSummary {
  totalCount: number;
  matches: Array<{ expression: string; count: number }>;
}

export interface PronunciationAssessmentResult {
  provider: 'azure';
  locale: 'en-US';
  recognizedText: string;
  overallScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  words: PronunciationWord[];
  possibleFillers: PossibleFillerSummary;
}

function boundedScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
}

function readAscii(buffer: Buffer, offset: number, length: number): string {
  return buffer.toString('ascii', offset, offset + length);
}

export function inspectPronunciationWav(buffer: Buffer): WavMetadata {
  if (buffer.length < 44 || readAscii(buffer, 0, 4) !== 'RIFF' || readAscii(buffer, 8, 4) !== 'WAVE') {
    throw new RangeError('Pronunciation audio must be a WAV file.');
  }

  let offset = 12;
  let format: { audioFormat: number; channels: number; sampleRate: number; bitsPerSample: number } | null = null;
  let dataBytes = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = readAscii(buffer, offset, 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkStart + chunkSize > buffer.length) throw new RangeError('Pronunciation WAV is truncated.');
    if (chunkId === 'fmt ' && chunkSize >= 16) {
      format = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === 'data') {
      dataBytes = chunkSize;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!format || !dataBytes) throw new RangeError('Pronunciation WAV is missing audio data.');
  if (format.audioFormat !== 1 || format.channels !== 1 || format.sampleRate !== REQUIRED_SAMPLE_RATE || format.bitsPerSample !== 16) {
    throw new RangeError('Pronunciation audio must be PCM, mono, 16 kHz, and 16-bit.');
  }
  const durationMs = (dataBytes / (format.sampleRate * format.channels * (format.bitsPerSample / 8))) * 1000;
  if (durationMs < MIN_CLIP_DURATION_MS || durationMs > MAX_CLIP_DURATION_MS) {
    throw new RangeError('Pronunciation clips must be between 0.1 and 30 seconds.');
  }
  return { channels: format.channels, sampleRate: format.sampleRate, bitsPerSample: format.bitsPerSample, durationMs };
}

export function pronunciationAudioHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function detectPossibleFillers(input: string | string[]): PossibleFillerSummary {
  const tokens = (Array.isArray(input) ? input.join(' ') : input)
    .toLocaleLowerCase('en-US')
    .match(/[a-z]+(?:'[a-z]+)?/g) || [];
  const counts = new Map<string, number>();
  const add = (expression: string) => counts.set(expression, (counts.get(expression) || 0) + 1);

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === 'you' && tokens[index + 1] === 'know') {
      add('you know');
      index += 1;
      continue;
    }
    const token = tokens[index];
    if (/^u+h+$/.test(token)) add('uh');
    else if (/^u+h?m+$/.test(token)) add('um');
    else if (/^e+r+m*$/.test(token)) add('er');
    else if (/^h+m+$/.test(token)) add('hmm');
    else if (token === 'like') add('like');
    else if (token === 'actually') add('actually');
  }

  const matches = ['um', 'uh', 'er', 'hmm', 'like', 'you know', 'actually']
    .filter((expression) => counts.has(expression))
    .map((expression) => ({ expression, count: counts.get(expression)! }));
  return {
    totalCount: matches.reduce((total, match) => total + match.count, 0),
    matches,
  };
}

export function parseAzurePronunciationResponse(body: any): PronunciationAssessmentResult {
  if (body?.RecognitionStatus !== 'Success') {
    const detail = body?.RecognitionStatus || body?.DisplayText || 'No speech was recognized.';
    throw new Error(`Microsoft Speech pronunciation assessment failed: ${detail}`);
  }
  const best = body?.NBest?.[0];
  if (!best) throw new Error('Microsoft Speech returned no pronunciation hypothesis.');
  const assessment = best.PronunciationAssessment || best;
  const words: PronunciationWord[] = Array.isArray(best.Words) ? best.Words.map((word: any) => {
    const wordAssessment = word?.PronunciationAssessment || word || {};
    return {
      word: String(word?.Word || '').trim(),
      accuracyScore: boundedScore(wordAssessment.AccuracyScore),
      errorType: String(wordAssessment.ErrorType || 'None'),
      phonemes: Array.isArray(word?.Phonemes) ? word.Phonemes.map((phoneme: any) => {
        const phonemeAssessment = phoneme?.PronunciationAssessment || phoneme || {};
        return {
          phoneme: String(phoneme?.Phoneme || '').trim(),
          accuracyScore: boundedScore(phonemeAssessment.AccuracyScore),
        };
      }).filter((phoneme: any) => phoneme.phoneme) : [],
    };
  }).filter((word: PronunciationWord) => word.word) : [];
  const recognizedText = String(best.Display || body.DisplayText || '').trim();
  return {
    provider: 'azure',
    locale: 'en-US',
    recognizedText,
    overallScore: boundedScore(assessment.PronScore),
    accuracyScore: boundedScore(assessment.AccuracyScore),
    fluencyScore: boundedScore(assessment.FluencyScore),
    completenessScore: boundedScore(assessment.CompletenessScore),
    prosodyScore: boundedScore(assessment.ProsodyScore),
    words,
    possibleFillers: detectPossibleFillers(words.length ? words.map((word) => word.word) : recognizedText),
  };
}

export async function assessEnglishPronunciation(input: {
  audio: Buffer;
  referenceText: string;
  apiKey?: string;
  region?: string;
  endpoint?: string;
}): Promise<PronunciationAssessmentResult> {
  inspectPronunciationWav(input.audio);
  const apiKey = String(input.apiKey || process.env.AZURE_SPEECH_KEY || '').trim();
  const region = String(input.region || process.env.AZURE_SPEECH_REGION || '').trim();
  const explicitEndpoint = String(input.endpoint || process.env.AZURE_SPEECH_ENDPOINT || '').trim().replace(/\/$/, '');
  const referenceText = input.referenceText.trim();
  if (!apiKey) throw new Error('Missing AZURE_SPEECH_KEY.');
  if (!explicitEndpoint && !/^[a-z0-9-]+$/i.test(region)) throw new Error('Missing or invalid AZURE_SPEECH_REGION.');
  if (!referenceText || referenceText.length > 2_000) throw new RangeError('Pronunciation reference text must contain between 1 and 2,000 characters.');

  const endpoint = explicitEndpoint || `https://${region}.stt.speech.microsoft.com`;
  const url = new URL('/speech/recognition/conversation/cognitiveservices/v1', endpoint);
  if (url.protocol !== 'https:') throw new Error('Microsoft Speech endpoint must use HTTPS.');
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('format', 'detailed');
  const configuration = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: true,
    EnableProsodyAssessment: true,
    PhonemeAlphabet: 'IPA',
    NBestPhonemeCount: 3,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Accept': 'application/json',
      'Pronunciation-Assessment': Buffer.from(JSON.stringify(configuration)).toString('base64'),
    },
    body: Uint8Array.from(input.audio).buffer,
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Microsoft Speech pronunciation assessment failed (${response.status}): ${body?.error?.message || response.statusText}`);
  }
  return {
    ...parseAzurePronunciationResponse(body),
    possibleFillers: detectPossibleFillers(referenceText),
  };
}
