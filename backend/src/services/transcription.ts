import fs from "fs/promises";

const DEEPGRAM_ENDPOINT = "https://api.deepgram.com/v1/listen";

export type TranscriptionLanguage = "en-US" | "pt-BR" | "es" | "multi";

const TRANSCRIPTION_LANGUAGES = new Set<TranscriptionLanguage>([
  "en-US",
  "pt-BR",
  "es",
  "multi",
]);

export function normalizeTranscriptionLanguage(value: unknown): TranscriptionLanguage {
  if (value === undefined || value === null || value === "") return "multi";
  if (typeof value === "string" && TRANSCRIPTION_LANGUAGES.has(value as TranscriptionLanguage)) {
    return value as TranscriptionLanguage;
  }
  throw new RangeError("Unsupported transcription language. Use en-US, pt-BR, or es.");
}

export interface TranscriptionInput {
  apiKey: string;
  filePath?: string;
  audio?: Buffer;
  mimeType: string;
  language?: TranscriptionLanguage;
  maxQuality?: boolean;
}

export interface DeepgramUsage {
  durationSeconds: number;
  costUsd: number;
}

export interface TranscriptionResult {
  provider: string;
  quality: string;
  language: TranscriptionLanguage;
  transcript: any;
  markdown: string;
  segments: TranscriptSegment[];
  usage: DeepgramUsage;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
}

export function createDeepgramUrl(
  options: { maxQuality?: boolean; language?: TranscriptionLanguage } = {},
): string {
  const { maxQuality = false } = options;
  const params = new URLSearchParams({
    model: "nova-3",
    language: normalizeTranscriptionLanguage(options.language),
    diarize_model: "latest",
    utterances: "true",
    smart_format: "true",
    punctuate: "true",
  });

  if (maxQuality) {
    params.set("paragraphs", "true");
  }

  return `${DEEPGRAM_ENDPOINT}?${params.toString()}`;
}

function formatTimestamp(seconds: number = 0): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatSpeakerBlock(
  speaker: string | number | undefined,
  start: number,
  words: string[],
): string {
  return `**Speaker ${speaker ?? "unknown"}** (${formatTimestamp(start)})\n${words.join(" ")}`;
}

export function createMarkdown(transcript: any): string {
  const utterances = transcript.results?.utterances || [];
  if (utterances.length > 0) {
    const turns: Array<{ speaker: string | number; start: number; transcripts: string[] }> = utterances.reduce((blocks: Array<{ speaker: string | number; start: number; transcripts: string[] }>, utterance: any) => {
      const speaker = utterance.speaker ?? "unknown";
      const previous = blocks[blocks.length - 1];
      if (previous?.speaker === speaker) {
        previous.transcripts.push(utterance.transcript);
      } else {
        blocks.push({ speaker, start: utterance.start || 0, transcripts: [utterance.transcript] });
      }
      return blocks;
    }, []);
    return turns
      .map((turn) => `**Speaker ${turn.speaker}** (${formatTimestamp(turn.start)})\n${turn.transcripts.join(" ")}`)
      .join("\n\n");
  }

  const words =
    transcript.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  if (words.length === 0) {
    return (
      transcript.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""
    );
  }

  const blocks: string[] = [];
  let currentSpeaker = words[0]?.speaker;
  let currentWords: string[] = [];
  let currentStart = words[0]?.start || 0;

  for (const word of words) {
    if (word.speaker !== currentSpeaker && currentWords.length > 0) {
      blocks.push(
        formatSpeakerBlock(currentSpeaker, currentStart, currentWords),
      );
      currentSpeaker = word.speaker;
      currentStart = word.start || 0;
      currentWords = [];
    }
    currentWords.push(word.punctuated_word || word.word);
  }

  if (currentWords.length > 0) {
    blocks.push(formatSpeakerBlock(currentSpeaker, currentStart, currentWords));
  }

  return blocks.join("\n\n");
}

export function extractTranscriptSegments(transcript: any): TranscriptSegment[] {
  const utterances = Array.isArray(transcript.results?.utterances)
    ? transcript.results.utterances
    : [];
  if (utterances.length > 0) {
    return utterances.flatMap((utterance: any, index: number) => {
      const text = String(utterance?.transcript || "").trim();
      const startSeconds = Number(utterance?.start);
      const explicitEnd = Number(utterance?.end);
      const nextStart = Number(utterances[index + 1]?.start);
      const endSeconds = Number.isFinite(explicitEnd)
        ? explicitEnd
        : nextStart;
      if (!text || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
        return [];
      }
      return [{
        speaker: `Speaker ${utterance?.speaker ?? "unknown"}`,
        text,
        startMs: Math.max(0, Math.round(startSeconds * 1000)),
        endMs: Math.max(0, Math.round(endSeconds * 1000)),
      }];
    });
  }

  const words = transcript.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  if (!Array.isArray(words) || words.length === 0) return [];

  const segments: TranscriptSegment[] = [];
  let current: TranscriptSegment | null = null;
  for (const word of words) {
    const speaker = `Speaker ${word?.speaker ?? "unknown"}`;
    const text = String(word?.punctuated_word || word?.word || "").trim();
    const startMs = Math.max(0, Math.round(Number(word?.start || 0) * 1000));
    const endMs = Math.max(startMs, Math.round(Number(word?.end || word?.start || 0) * 1000));
    if (!text || endMs <= startMs) continue;
    if (!current || current.speaker !== speaker) {
      current = { speaker, text, startMs, endMs };
      segments.push(current);
    } else {
      current.text = `${current.text} ${text}`;
      current.endMs = endMs;
    }
  }
  return segments;
}

export async function transcribeWithDeepgram(
  input: TranscriptionInput,
): Promise<TranscriptionResult> {
  const { apiKey, filePath, mimeType, language = "multi", maxQuality = false } = input;
  if (!apiKey) {
    throw new Error(
      "Missing DEEPGRAM_API_KEY. Set it in your shell before running the app.",
    );
  }

  let audio: Buffer;
  if (input.audio) {
    audio = input.audio;
  } else if (filePath && /^https:\/\//i.test(filePath)) {
    const audioResponse = await fetch(filePath);
    if (!audioResponse.ok) {
      throw new Error(
        `Could not download recording from Vercel Blob (${audioResponse.status}).`,
      );
    }
    audio = Buffer.from(await audioResponse.arrayBuffer());
  } else if (filePath) {
    audio = await fs.readFile(filePath);
  } else {
    throw new Error('Transcription input has no audio source.');
  }
  const response = await fetch(createDeepgramUrl({ maxQuality, language }), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType || "audio/webm",
    },
    body: Uint8Array.from(audio).buffer,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.err_msg || body.error || response.statusText;
    throw new Error(`Deepgram transcription failed: ${message}`);
  }

  const durationSeconds = body.metadata?.duration || 0;
  const costUsd = (durationSeconds / 60) * 0.0043; // Deepgram Nova-3 approx cost

  return {
    provider: "deepgram",
    quality: maxQuality ? "max" : "standard",
    language,
    transcript: body,
    markdown: createMarkdown(body),
    segments: extractTranscriptSegments(body),
    usage: {
      durationSeconds,
      costUsd,
    },
  };
}
