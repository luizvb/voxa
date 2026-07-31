import { createHash } from 'node:crypto';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

const SINGLE_SHOT_MAX_DURATION_MS = 30_000;
const MAX_CLIP_DURATION_MS = 120_000;
const MIN_CLIP_DURATION_MS = 100;
const MAX_REFERENCE_TEXT_LENGTH = 5_000;
const REQUIRED_SAMPLE_RATE = 16_000;
const CONTINUOUS_TIMEOUT_MS = 210_000;
const AZURE_TICKS_PER_MILLISECOND = 10_000;

export type PronunciationAssessmentMode = 'single-shot' | 'continuous';

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
  offsetMs: number | null;
  durationMs: number | null;
  phonemes: Array<{ phoneme: string; accuracyScore: number | null }>;
}

export interface PossibleFillerSummary {
  totalCount: number;
  matches: Array<{ expression: string; count: number }>;
}

export interface PronunciationAssessmentResult {
  provider: 'azure';
  locale: 'en-US';
  assessmentMode: PronunciationAssessmentMode;
  recognizedText: string;
  overallScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  words: PronunciationWord[];
  possibleFillers: PossibleFillerSummary;
}

type AzureAssessmentBody = Record<string, any>;

function boundedScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
}

function average(values: Array<number | null | undefined>): number | null {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
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

function azureTicksToMilliseconds(value: unknown): number | null {
  const ticks = Number(value);
  if (!Number.isFinite(ticks) || ticks < 0) return null;
  return ticks / AZURE_TICKS_PER_MILLISECOND;
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
    throw new RangeError('Pronunciation clips must be between 0.1 and 120 seconds.');
  }
  return { channels: format.channels, sampleRate: format.sampleRate, bitsPerSample: format.bitsPerSample, durationMs };
}

export function pronunciationAssessmentModeForDuration(durationMs: number): PronunciationAssessmentMode {
  return durationMs > SINGLE_SHOT_MAX_DURATION_MS ? 'continuous' : 'single-shot';
}

export function pronunciationAudioHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function successfulRecognition(body: AzureAssessmentBody): boolean {
  return body?.RecognitionStatus === 'Success'
    || body?.RecognitionStatus === 0
    || body?.RecognitionStatus === '0';
}

function parseAzureWord(word: any): PronunciationWord | null {
  const text = String(word?.Word || '').trim();
  if (!text) return null;
  const wordAssessment = word?.PronunciationAssessment || word || {};
  const offsetMs = azureTicksToMilliseconds(word?.Offset);
  const durationMs = azureTicksToMilliseconds(word?.Duration);
  return {
    word: text,
    accuracyScore: boundedScore(wordAssessment.AccuracyScore),
    errorType: String(wordAssessment.ErrorType || 'None'),
    offsetMs,
    durationMs: durationMs !== null && durationMs > 0 ? durationMs : null,
    phonemes: Array.isArray(word?.Phonemes) ? word.Phonemes.map((phoneme: any) => {
      const phonemeAssessment = phoneme?.PronunciationAssessment || phoneme || {};
      return {
        phoneme: String(phoneme?.Phoneme || '').trim(),
        accuracyScore: boundedScore(phonemeAssessment.AccuracyScore),
      };
    }).filter((phoneme: any) => phoneme.phoneme) : [],
  };
}

function parseAzureBody(body: AzureAssessmentBody, assessmentMode: PronunciationAssessmentMode): PronunciationAssessmentResult {
  if (!successfulRecognition(body)) {
    const detail = body?.RecognitionStatus || body?.DisplayText || 'No speech was recognized.';
    throw new Error(`Microsoft Speech pronunciation assessment failed: ${detail}`);
  }
  const best = body?.NBest?.[0];
  if (!best) throw new Error('Microsoft Speech returned no pronunciation hypothesis.');
  const assessment = best.PronunciationAssessment || best;
  const words: PronunciationWord[] = Array.isArray(best.Words)
    ? best.Words.map(parseAzureWord).filter((word: PronunciationWord | null): word is PronunciationWord => Boolean(word))
    : [];
  const recognizedText = String(best.Display || body.DisplayText || '').trim();
  return {
    provider: 'azure',
    locale: 'en-US',
    assessmentMode,
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

export function parseAzurePronunciationResponse(body: any): PronunciationAssessmentResult {
  return parseAzureBody(body, 'single-shot');
}

function normalizeAlignmentWord(value: unknown): string {
  return String(value || '')
    .toLocaleLowerCase('en-US')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function referenceWords(referenceText: string): string[] {
  return referenceText.match(/[\p{L}\p{N}]+(?:['\u2019-][\p{L}\p{N}]+)*/gu) || [];
}

export function alignPronunciationWords(referenceText: string, recognizedWords: PronunciationWord[]): PronunciationWord[] {
  const expected = referenceWords(referenceText);
  const recognized = recognizedWords.filter((word) => normalizeAlignmentWord(word.word));
  const rows = expected.length + 1;
  const columns = recognized.length + 1;
  const table = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let row = 1; row < rows; row += 1) {
    const expectedWord = normalizeAlignmentWord(expected[row - 1]);
    for (let column = 1; column < columns; column += 1) {
      if (expectedWord === normalizeAlignmentWord(recognized[column - 1].word)) {
        table[row][column] = table[row - 1][column - 1] + 1;
      } else {
        table[row][column] = Math.max(table[row - 1][column], table[row][column - 1]);
      }
    }
  }

  const reversed: PronunciationWord[] = [];
  let row = expected.length;
  let column = recognized.length;
  while (row > 0 || column > 0) {
    const expectedWord = row > 0 ? normalizeAlignmentWord(expected[row - 1]) : '';
    const recognizedWord = column > 0 ? normalizeAlignmentWord(recognized[column - 1].word) : '';
    if (row > 0 && column > 0 && expectedWord === recognizedWord) {
      reversed.push(recognized[column - 1]);
      row -= 1;
      column -= 1;
    } else if (column > 0 && (row === 0 || table[row][column - 1] >= table[row - 1][column])) {
      reversed.push({ ...recognized[column - 1], errorType: 'Insertion' });
      column -= 1;
    } else {
      reversed.push({
        word: expected[row - 1],
        accuracyScore: null,
        errorType: 'Omission',
        offsetMs: null,
        durationMs: null,
        phonemes: [],
      });
      row -= 1;
    }
  }
  return reversed.reverse();
}

export function aggregateContinuousPronunciationResults(
  bodies: AzureAssessmentBody[],
  referenceText: string,
): PronunciationAssessmentResult {
  const partials = bodies.map((body) => parseAzureBody(body, 'continuous'));
  if (!partials.length) throw new Error('Microsoft Speech returned no pronunciation results.');
  const alignedWords = alignPronunciationWords(referenceText, partials.flatMap((partial) => partial.words))
    .map((word) => word.errorType === 'None' && word.accuracyScore !== null && word.accuracyScore < 60
      ? { ...word, errorType: 'Mispronunciation' }
      : word);
  const referenceAligned = alignedWords.filter((word) => word.errorType !== 'Insertion');
  const accuracyScore = average(referenceAligned.map((word) => word.accuracyScore ?? 0));
  const validWords = referenceAligned.filter((word) => word.errorType === 'None');
  const completenessScore = referenceAligned.length
    ? Math.min(100, (validWords.length / referenceAligned.length) * 100)
    : null;
  const timedWords = alignedWords.filter((word) => word.offsetMs !== null && word.durationMs !== null);
  const firstOffset = timedWords.length ? Math.min(...timedWords.map((word) => word.offsetMs!)) : null;
  const finalOffset = timedWords.length
    ? Math.max(...timedWords.map((word) => word.offsetMs! + word.durationMs! + 10))
    : null;
  const fluentDuration = validWords.reduce(
    (sum, word) => sum + (word.durationMs === null ? 0 : word.durationMs + 10),
    0,
  );
  const fluencyScore = firstOffset !== null && finalOffset !== null && finalOffset > firstOffset
    ? boundedScore((fluentDuration / (finalOffset - firstOffset)) * 100)
    : average(partials.map((partial) => partial.fluencyScore));
  const prosodyScore = average(partials.map((partial) => partial.prosodyScore));
  const scoredDimensions = [accuracyScore, prosodyScore, completenessScore, fluencyScore]
    .filter((score): score is number => score !== null);
  let overallScore: number | null = null;
  if (accuracyScore !== null && completenessScore !== null && fluencyScore !== null) {
    if (prosodyScore !== null) {
      const scores = [accuracyScore, prosodyScore, completenessScore, fluencyScore];
      overallScore = boundedScore((scores.reduce((sum, score) => sum + score, 0) * 0.2) + (Math.min(...scores) * 0.2));
    } else {
      const scores = [accuracyScore, completenessScore, fluencyScore];
      overallScore = boundedScore((scores.reduce((sum, score) => sum + score, 0) * 0.2) + (Math.min(...scores) * 0.4));
    }
  } else {
    overallScore = average(scoredDimensions);
  }

  return {
    provider: 'azure',
    locale: 'en-US',
    assessmentMode: 'continuous',
    recognizedText: partials.map((partial) => partial.recognizedText).filter(Boolean).join(' '),
    overallScore,
    accuracyScore,
    fluencyScore,
    completenessScore,
    prosodyScore,
    words: alignedWords,
    possibleFillers: detectPossibleFillers(referenceText),
  };
}

function validateConfiguration(input: {
  referenceText: string;
  apiKey?: string;
  region?: string;
  endpoint?: string;
}) {
  const apiKey = String(input.apiKey || process.env.AZURE_SPEECH_KEY || '').trim();
  const region = String(input.region || process.env.AZURE_SPEECH_REGION || '').trim();
  const explicitEndpoint = String(input.endpoint || process.env.AZURE_SPEECH_ENDPOINT || '').trim().replace(/\/$/, '');
  const referenceText = input.referenceText.trim();
  if (!apiKey) throw new Error('Missing AZURE_SPEECH_KEY.');
  if (!explicitEndpoint && !/^[a-z0-9-]+$/i.test(region)) throw new Error('Missing or invalid AZURE_SPEECH_REGION.');
  if (!referenceText || referenceText.length > MAX_REFERENCE_TEXT_LENGTH) {
    throw new RangeError('Pronunciation reference text must contain between 1 and 5,000 characters.');
  }
  if (explicitEndpoint && new URL(explicitEndpoint).protocol !== 'https:') {
    throw new Error('Microsoft Speech endpoint must use HTTPS.');
  }
  return { apiKey, region, explicitEndpoint, referenceText };
}

async function assessEnglishPronunciationSingleShot(input: {
  audio: Buffer;
  referenceText: string;
  apiKey: string;
  region: string;
  explicitEndpoint: string;
}): Promise<PronunciationAssessmentResult> {
  const endpoint = input.explicitEndpoint || `https://${input.region}.stt.speech.microsoft.com`;
  const url = new URL('/speech/recognition/conversation/cognitiveservices/v1', endpoint);
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('format', 'detailed');
  const configuration = {
    ReferenceText: input.referenceText,
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
      'Ocp-Apim-Subscription-Key': input.apiKey,
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
  return parseAzurePronunciationResponse(body);
}

async function assessEnglishPronunciationContinuous(input: {
  audio: Buffer;
  referenceText: string;
  apiKey: string;
  region: string;
  explicitEndpoint: string;
}): Promise<PronunciationAssessmentResult> {
  const speechConfig = input.explicitEndpoint
    ? SpeechSDK.SpeechConfig.fromEndpoint(new URL(input.explicitEndpoint), input.apiKey)
    : SpeechSDK.SpeechConfig.fromSubscription(input.apiKey, input.region);
  speechConfig.speechRecognitionLanguage = 'en-US';
  speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
  speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, '1500');
  const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(input.audio, 'pronunciation-segment.wav');
  const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
  const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
    input.referenceText,
    SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
    SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
    false,
  );
  pronunciationConfig.phonemeAlphabet = 'IPA';
  pronunciationConfig.nbestPhonemeCount = 3;
  pronunciationConfig.enableProsodyAssessment = true;
  pronunciationConfig.applyTo(recognizer);

  return new Promise<PronunciationAssessmentResult>((resolve, reject) => {
    const bodies: AzureAssessmentBody[] = [];
    let settled = false;
    const cleanup = () => {
      recognizer.close();
      audioConfig.close();
      speechConfig.close();
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      try {
        resolve(aggregateContinuousPronunciationResults(bodies, input.referenceText));
      } catch (aggregationError) {
        reject(aggregationError);
      }
    };
    const timeout = setTimeout(() => {
      finish(new Error('Microsoft Speech continuous pronunciation assessment timed out.'));
    }, CONTINUOUS_TIMEOUT_MS);

    recognizer.recognized = (_sender, event) => {
      if (event.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return;
      const raw = event.result.properties.getProperty(SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult);
      if (!raw) return;
      try {
        bodies.push(JSON.parse(raw));
      } catch {
        finish(new Error('Microsoft Speech returned an invalid continuous pronunciation response.'));
      }
    };
    recognizer.sessionStopped = () => finish();
    recognizer.canceled = (_sender, event) => {
      if (event.reason === SpeechSDK.CancellationReason.EndOfStream) {
        finish();
      } else {
        finish(new Error(`Microsoft Speech continuous pronunciation assessment failed: ${event.errorDetails || 'Unknown error.'}`));
      }
    };
    recognizer.startContinuousRecognitionAsync(
      undefined,
      (error) => finish(new Error(`Microsoft Speech continuous pronunciation assessment failed: ${error}`)),
    );
  });
}

export async function assessEnglishPronunciation(input: {
  audio: Buffer;
  referenceText: string;
  apiKey?: string;
  region?: string;
  endpoint?: string;
}): Promise<PronunciationAssessmentResult> {
  const wav = inspectPronunciationWav(input.audio);
  const configuration = validateConfiguration(input);
  const result = pronunciationAssessmentModeForDuration(wav.durationMs) === 'continuous'
    ? await assessEnglishPronunciationContinuous({ audio: input.audio, ...configuration })
    : await assessEnglishPronunciationSingleShot({ audio: input.audio, ...configuration });
  return {
    ...result,
    possibleFillers: detectPossibleFillers(configuration.referenceText),
  };
}
