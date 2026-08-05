import { upload } from '@vercel/blob/client';
import { getAuthCredentials, getAuthToken } from './auth-token';
import {
  deleteRecordingDraft,
  downloadRecordingDraft,
  getRecordingDraft,
  isSupportedRecordingFile,
  listRecordingDrafts,
  MAX_RECORDING_FILE_BYTES,
  persistRecordingBlobDraft,
  persistRecordingDraft,
  putRecordingDraft,
  readRecordingDurationMs,
  subscribeToRecordingRecovery,
  updateRecordingDraft,
} from '../lib/recording-recovery';
import type { AnalysisInput, AnalysisSummary, BillingStatus, ImportRecordingInput, PendingRecording, PronunciationAssessment, PronunciationAssessmentInput, Recording, RecordingMediaSource, RenameTranscriptSpeakersInput, SaveRecordingInput, TranscriptResult, TranscriptionInput, VoxaPlatform } from './types';

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'same-origin',
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
  return response;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(path, init);
  if (response.status === 404) return null as T;
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.status === 204 ? undefined as T : response.json();
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'local-user';
}

async function recordingRequestWithToken(token: string, input: PendingRecording): Promise<Recording> {
  const response = await fetch(apiUrl('/api/recordings'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      id: input.id,
      name: input.name,
      durationMs: input.durationMs,
      mode: input.mode,
      mimeType: input.mimeType,
      extension: input.extension,
      createdAt: input.createdAt,
      blobUrl: input.blobUrl,
      sizeBytes: input.sizeBytes,
    }),
  });
  if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.json() as Promise<Recording>;
}

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export class WebPlatform implements VoxaPlatform {
  capabilities = {
    kind: 'web' as const,
    systemAudio: Boolean(navigator.mediaDevices?.getDisplayMedia) && /Chrome|Edg\//.test(navigator.userAgent),
    globalShortcuts: false, widget: false, localFolder: false, nativePdf: false,
  };

  listRecordings() { return request<Recording[]>('/api/recordings'); }

  async saveRecording(input: SaveRecordingInput) {
    const id = input.id || crypto.randomUUID();
    await persistRecordingDraft({ ...input, id });
    return this.retryPendingRecording(id);
  }

  async importRecording(input: ImportRecordingInput) {
    if (!isSupportedRecordingFile(input.file)) {
      if (input.file.size > MAX_RECORDING_FILE_BYTES) throw new Error('The selected WebM is larger than 1 GB.');
      throw new Error('Choose a non-empty WebM audio file.');
    }
    const id = crypto.randomUUID();
    const durationMs = await readRecordingDurationMs(input.file);
    await persistRecordingBlobDraft({
      id,
      name: input.name.trim() || input.file.name.replace(/\.webm$/i, ''),
      durationMs,
      mode: 'audio-import',
      mimeType: input.file.type || 'audio/webm',
      extension: 'webm',
      createdAt: new Date().toISOString(),
    }, input.file);
    return this.retryPendingRecording(id);
  }

  async listPendingRecordings() {
    return listRecordingDrafts();
  }

  async retryPendingRecording(id: string) {
    let draft = await getRecordingDraft(id);
    if (!draft) throw new Error('The protected local recording is no longer available.');
    try {
      draft = await updateRecordingDraft(id, { state: 'uploading', lastError: undefined });
      const { authToken: token, userId } = await getAuthCredentials();
      if (!draft.blobUrl) {
        const pathname = `recordings/${safePathSegment(userId)}/${draft.id}.${draft.extension}`;
        const uploaded = await upload(pathname, draft.blob, {
          access: 'public',
          multipart: true,
          handleUploadUrl: apiUrl('/api/recordings/upload'),
          headers: { Authorization: `Bearer ${token}` },
        });
        draft = await updateRecordingDraft(id, { blobUrl: uploaded.url, state: 'finalizing' });
      } else if (draft.state !== 'finalizing') {
        draft = await updateRecordingDraft(id, { state: 'finalizing' });
      }
      const recording = await recordingRequestWithToken(token, draft);
      await deleteRecordingDraft(id);
      return recording;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const current = await getRecordingDraft(id).catch(() => null);
      if (current) await putRecordingDraft({ ...current, state: 'failed', lastError: message }).catch(() => {});
      throw error;
    }
  }

  async deletePendingRecording(id: string) {
    await deleteRecordingDraft(id);
  }

  async downloadPendingRecording(id: string) {
    const draft = await getRecordingDraft(id);
    if (!draft) throw new Error('The protected local recording is no longer available.');
    downloadRecordingDraft(draft);
  }

  subscribeToPendingRecordingsChanged(callback: () => void) { return subscribeToRecordingRecovery(callback); }

  importTranscript(input: { name: string; transcript: string }) {
    return request<Recording>('/api/recordings/import-transcript', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
  }

  deleteRecording(id: string) { return request<void>(`/api/recordings/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  async transcribe(input: TranscriptionInput) {
    const recordingId = encodeURIComponent(input.recordingId);
    await request<{ recordingId: string; state: string }>(`/api/recordings/${recordingId}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: input.language, maxQuality: Boolean(input.maxQuality) }),
    });

    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      const status = await request<{ state: string; error?: string }>(`/api/recordings/${recordingId}/status`);
      if (status.state === 'failed') throw new Error(status.error || 'Transcription failed.');
      if (status.state === 'ready') {
        const transcript = await this.getTranscript(input.recordingId);
        if (!transcript?.markdown) throw new Error('Transcription finished without readable text.');
        return transcript;
      }
      await wait(1500);
    }

    throw new Error('Transcription is taking longer than expected. Try again in a moment.');
  }
  getTranscript(id: string) { return request<TranscriptResult | null>(`/api/recordings/${encodeURIComponent(id)}/transcript`); }
  renameTranscriptSpeakers(input: RenameTranscriptSpeakersInput) {
    return request<Pick<TranscriptResult, 'markdown' | 'speakers'>>(`/api/recordings/${encodeURIComponent(input.recordingId)}/transcript/speakers`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ speakers: input.speakers }),
    });
  }
  async assessPronunciation(input: PronunciationAssessmentInput) {
    const form = new FormData();
    form.append('audio', new Blob([input.audio], { type: 'audio/wav' }), 'segment.wav');
    const response = await authenticatedFetch(
      `/api/recordings/${encodeURIComponent(input.recordingId)}/transcript/segments/${encodeURIComponent(input.segmentId)}/pronunciation`,
      { method: 'POST', body: form },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error || `Pronunciation assessment failed (${response.status})`);
    }
    return response.json() as Promise<PronunciationAssessment>;
  }
  analyze(input: AnalysisInput) { return request<any>(`/api/recordings/${encodeURIComponent(input.recordingId)}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); }
  listAnalyses(id: string) { return request<AnalysisSummary[]>(`/api/recordings/${encodeURIComponent(id)}/analyses`); }
  getAnalysis(id: string, analysisId?: string) {
    const suffix = analysisId ? `/analyses/${encodeURIComponent(analysisId)}` : '/analysis';
    return request<any | null>(`/api/recordings/${encodeURIComponent(id)}${suffix}`);
  }
  createCheckoutSession() { return request<{ url: string | null }>('/api/stripe/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' } }); }
  getBillingStatus() { return request<BillingStatus>('/api/stripe/status'); }
  createBillingPortalSession() { return request<{ url: string | null }>('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' } }); }
  async openBillingUrl(url: string) { window.location.assign(url); }
  async exportAnalysisPdf(input: { analysis: any; recording: Recording; locale: string }) {
    const { downloadAnalysisPdf } = await import('../lib/browser-pdf');
    const filePath = await downloadAnalysisPdf(input);
    return { canceled: false, filePath };
  }
  async loadRecordingMedia(recording: Recording): Promise<RecordingMediaSource> {
    const response = await authenticatedFetch(`/api/recordings/${encodeURIComponent(recording.id)}/media`);
    if (!response.ok) throw new Error((await response.text()) || `Could not load audio (${response.status})`);

    const blob = await response.blob();
    if (!blob.size) throw new Error('The saved audio file is empty.');

    const url = URL.createObjectURL(blob);
    let revoked = false;
    return {
      url,
      revoke() {
        if (revoked) return;
        revoked = true;
        URL.revokeObjectURL(url);
      },
    };
  }
  subscribeToRecordingsChanged() { return () => undefined; }
}
