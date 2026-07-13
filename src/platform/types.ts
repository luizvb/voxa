export interface Recording {
  id: string;
  name: string;
  durationMs: number;
  createdAt?: string;
  transcript?: { ready?: boolean } | null;
  playbackUrl?: string;
  sizeBytes?: number;
  hasAudio?: boolean;
}

export interface RecordingMediaSource {
  url: string;
  revoke(): void;
}

export interface TranscriptResult {
  markdown: string;
  speakers?: string[];
}

export type TranscriptionLanguage = 'en-US' | 'pt-BR' | 'es';

export interface TranscriptionInput {
  recordingId: string;
  language: TranscriptionLanguage;
  maxQuality?: boolean;
}

export interface PlatformCapabilities {
  kind: 'electron' | 'web';
  systemAudio: boolean;
  globalShortcuts: boolean;
  widget: boolean;
  localFolder: boolean;
  nativePdf: boolean;
}

export interface SaveRecordingInput {
  id?: string;
  name: string;
  durationMs: number;
  mode: string;
  mimeType: string;
  extension: string;
  bytes: ArrayBuffer;
}

export interface AnalysisInput {
  recordingId: string;
  modes?: string[];
  outputLanguage?: string;
  context?: string;
  selectedSpeakers?: string[];
}

export interface VoxaPlatform {
  capabilities: PlatformCapabilities;
  listRecordings(): Promise<Recording[]>;
  saveRecording(input: SaveRecordingInput): Promise<Recording>;
  importTranscript(input: { name: string; transcript: string }): Promise<Recording>;
  deleteRecording(id: string): Promise<void>;
  transcribe(input: TranscriptionInput): Promise<{ markdown: string }>;
  getTranscript(recordingId: string): Promise<TranscriptResult | null>;
  analyze(input: AnalysisInput): Promise<any>;
  getAnalysis(recordingId: string): Promise<any | null>;
  exportAnalysisPdf(input: { analysis: any; recording: Recording; locale: string }): Promise<{ canceled: boolean; filePath?: string }>;
  loadRecordingMedia?(recording: Recording): Promise<RecordingMediaSource>;
  subscribeToRecordingsChanged(callback: () => void): () => void;
  createCheckoutSession(): Promise<{ url: string | null }>;
  getShortcutSettings?(): Promise<{ record: string; options: string[] }>;
  setRecordShortcut?(shortcut: string): Promise<{ record: string; options: string[] }>;
  subscribeToShortcutRecord?(callback: () => void): () => void;
  openMicrophoneSettings?(): Promise<boolean>;
}
