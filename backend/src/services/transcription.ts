import fs from 'fs/promises';

const DEEPGRAM_ENDPOINT = 'https://api.deepgram.com/v1/listen';

export interface TranscriptionInput {
  apiKey: string;
  filePath: string;
  mimeType: string;
  maxQuality?: boolean;
}

export interface DeepgramUsage {
  durationSeconds: number;
  costUsd: number;
}

export interface TranscriptionResult {
  provider: string;
  quality: string;
  transcript: any;
  markdown: string;
  usage: DeepgramUsage;
}

export function createDeepgramUrl(options: { maxQuality?: boolean } = {}): string {
  const { maxQuality = false } = options;
  const params = new URLSearchParams({
    model: 'nova-3',
    diarize_model: 'latest',
    smart_format: 'true',
    punctuate: 'true',
    diarize: 'true'
  });

  if (maxQuality) {
    params.set('detect_language', 'true');
    params.set('paragraphs', 'true');
    params.set('utterances', 'true');
  }

  return `${DEEPGRAM_ENDPOINT}?${params.toString()}`;
}

function formatTimestamp(seconds: number = 0): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const remainder = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatSpeakerBlock(speaker: string | number | undefined, start: number, words: string[]): string {
  return `**Speaker ${speaker ?? 'unknown'}** (${formatTimestamp(start)})\n${words.join(' ')}`;
}

export function createMarkdown(transcript: any): string {
  const utterances = transcript.results?.utterances || [];
  if (utterances.length > 0) {
    return utterances.map((utterance: any) => {
      const speaker = `Speaker ${utterance.speaker ?? 'unknown'}`;
      return `**${speaker}** (${formatTimestamp(utterance.start)})\n${utterance.transcript}`;
    }).join('\n\n');
  }

  const words = transcript.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  if (words.length === 0) {
    return transcript.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  }

  const blocks: string[] = [];
  let currentSpeaker = words[0]?.speaker;
  let currentWords: string[] = [];
  let currentStart = words[0]?.start || 0;

  for (const word of words) {
    if (word.speaker !== currentSpeaker && currentWords.length > 0) {
      blocks.push(formatSpeakerBlock(currentSpeaker, currentStart, currentWords));
      currentSpeaker = word.speaker;
      currentStart = word.start || 0;
      currentWords = [];
    }
    currentWords.push(word.punctuated_word || word.word);
  }

  if (currentWords.length > 0) {
    blocks.push(formatSpeakerBlock(currentSpeaker, currentStart, currentWords));
  }

  return blocks.join('\n\n');
}

export async function transcribeWithDeepgram(input: TranscriptionInput): Promise<TranscriptionResult> {
  const { apiKey, filePath, mimeType, maxQuality = false } = input;
  if (!apiKey) {
    throw new Error('Missing DEEPGRAM_API_KEY. Set it in your shell before running the app.');
  }

  const audio = await fs.readFile(filePath);
  const response = await fetch(createDeepgramUrl({ maxQuality }), {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/webm'
    },
    body: audio
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.err_msg || body.error || response.statusText;
    throw new Error(`Deepgram transcription failed: ${message}`);
  }

  const durationSeconds = body.metadata?.duration || 0;
  const costUsd = (durationSeconds / 60) * 0.0043; // Deepgram Nova-3 approx cost

  return {
    provider: 'deepgram',
    quality: maxQuality ? 'max' : 'standard',
    transcript: body,
    markdown: createMarkdown(body),
    usage: {
      durationSeconds,
      costUsd
    }
  };
}
