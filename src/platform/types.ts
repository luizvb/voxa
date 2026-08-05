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
  language?: string | null;
  segments?: TranscriptSegment[];
}

export interface RenameTranscriptSpeakersInput {
  recordingId: string;
  speakers: Record<string, string>;
}

export interface PronunciationAssessment {
  id: string;
  provider: 'azure';
  locale: 'en-US';
  assessmentMode?: 'single-shot' | 'continuous';
  recognizedText: string;
  overallScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  words: Array<{
    word: string;
    accuracyScore: number | null;
    errorType: string;
    offsetMs?: number | null;
    durationMs?: number | null;
    phonemes: Array<{ phoneme: string; accuracyScore: number | null }>;
  }>;
  possibleFillers?: {
    totalCount: number;
    matches: Array<{ expression: string; count: number }>;
  };
  createdAt: string;
}

export interface TranscriptSegment {
  id: string;
  position: number;
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
  assessment?: PronunciationAssessment | null;
}

export interface PronunciationAssessmentInput {
  recordingId: string;
  segmentId: string;
  audio: ArrayBuffer;
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
  createdAt?: string;
}

export interface ImportRecordingInput {
  name: string;
  file: File;
}

export interface PendingRecording {
  id: string;
  name: string;
  durationMs: number;
  mode: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  state: 'protected' | 'uploading' | 'finalizing' | 'failed';
  blob: Blob;
  blobUrl?: string;
  lastError?: string;
}

export interface AnalysisInput {
  recordingId: string;
  modes?: string[];
  outputLanguage?: string;
  context?: string;
  selectedSpeakers?: string[];
}

export interface AnalysisSummary {
  id: string;
  createdAt: string;
  modes: string[];
}

export interface BillingStatus {
  configured: boolean;
  planKey: string | null;
  planLabel: string;
  rawStatus: string;
  normalizedState: 'free' | 'checkout_pending' | 'trial_active' | 'trial_expired' | 'trialing' | 'active' | 'past_due_grace' | 'past_due_blocked' | 'cancel_scheduled' | 'paused' | 'canceled' | 'incomplete' | 'reconciliation_required';
  paidAccess: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  checkoutRequired: boolean;
  reconciliationRequired: boolean;
  portalAvailable: boolean;
}

export interface VoxaPlatform {
  capabilities: PlatformCapabilities;
  listRecordings(): Promise<Recording[]>;
  saveRecording(input: SaveRecordingInput): Promise<Recording>;
  importRecording(input: ImportRecordingInput): Promise<Recording>;
  importTranscript(input: { name: string; transcript: string }): Promise<Recording>;
  deleteRecording(id: string): Promise<void>;
  transcribe(input: TranscriptionInput): Promise<TranscriptResult>;
  getTranscript(recordingId: string): Promise<TranscriptResult | null>;
  renameTranscriptSpeakers(input: RenameTranscriptSpeakersInput): Promise<Pick<TranscriptResult, 'markdown' | 'speakers'>>;
  assessPronunciation(input: PronunciationAssessmentInput): Promise<PronunciationAssessment>;
  analyze(input: AnalysisInput): Promise<any>;
  listAnalyses(recordingId: string): Promise<AnalysisSummary[]>;
  getAnalysis(recordingId: string, analysisId?: string): Promise<any | null>;
  exportAnalysisPdf(input: { analysis: any; recording: Recording; locale: string }): Promise<{ canceled: boolean; filePath?: string }>;
  loadRecordingMedia?(recording: Recording): Promise<RecordingMediaSource>;
  subscribeToRecordingsChanged(callback: () => void): () => void;
  createCheckoutSession(): Promise<{ url: string | null }>;
  getBillingStatus(): Promise<BillingStatus>;
  createBillingPortalSession(): Promise<{ url: string | null }>;
  openBillingUrl(url: string): Promise<void>;
  listPendingRecordings?(): Promise<PendingRecording[]>;
  retryPendingRecording?(id: string): Promise<Recording>;
  deletePendingRecording?(id: string): Promise<void>;
  downloadPendingRecording?(id: string): Promise<void>;
  subscribeToPendingRecordingsChanged?(callback: () => void): () => void;
  getShortcutSettings?(): Promise<{ record: string; options: string[] }>;
  setRecordShortcut?(shortcut: string): Promise<{ record: string; options: string[] }>;
  subscribeToShortcutRecord?(callback: () => void): () => void;
  openMicrophoneSettings?(): Promise<boolean>;
}
