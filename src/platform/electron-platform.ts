import { getAuthCredentials } from './auth-token';
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
} from '../lib/recording-recovery';
import type { AnalysisInput, ImportRecordingInput, PronunciationAssessmentInput, Recording, RecordingMediaSource, SaveRecordingInput, TranscriptionInput, VoxaPlatform } from './types';

export class ElectronPlatform implements VoxaPlatform {
  capabilities = { kind: 'electron' as const, systemAudio: true, globalShortcuts: true, widget: true, localFolder: true, nativePdf: true };

  private auth() { return getAuthCredentials(); }

  async listRecordings() { return window.recorder.listRecordings(await this.auth()); }
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
  async listPendingRecordings() { return listRecordingDrafts(); }
  async retryPendingRecording(id: string) {
    const draft = await getRecordingDraft(id);
    if (!draft) throw new Error('The protected local recording is no longer available.');
    try {
      await putRecordingDraft({ ...draft, state: 'uploading', lastError: undefined });
      const bytes = await draft.blob.arrayBuffer();
      const recording = await window.recorder.saveRecording({
        id: draft.id,
        name: draft.name,
        durationMs: draft.durationMs,
        mode: draft.mode,
        mimeType: draft.mimeType,
        extension: draft.extension,
        createdAt: draft.createdAt,
        bytes,
        ...(await this.auth()),
      });
      await deleteRecordingDraft(id);
      return recording;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const current = await getRecordingDraft(id).catch(() => null);
      if (current) await putRecordingDraft({ ...current, state: 'failed', lastError: message }).catch(() => {});
      throw error;
    }
  }
  async deletePendingRecording(id: string) { await deleteRecordingDraft(id); }
  async downloadPendingRecording(id: string) {
    const draft = await getRecordingDraft(id);
    if (!draft) throw new Error('The protected local recording is no longer available.');
    downloadRecordingDraft(draft);
  }
  subscribeToPendingRecordingsChanged(callback: () => void) { return subscribeToRecordingRecovery(callback); }
  async importTranscript(input: { name: string; transcript: string }) { return window.recorder.importTranscript({ ...input, ...(await this.auth()) }); }
  async deleteRecording(id: string) { await window.recorder.deleteRecording(id, await this.auth()); }
  async loadRecordingMedia(recording: Recording): Promise<RecordingMediaSource> {
    const media = await window.recorder.loadRecordingMedia(recording.id, await this.auth());
    const url = URL.createObjectURL(new Blob([media.bytes], { type: media.mimeType || 'audio/webm' }));
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
  async transcribe(input: TranscriptionInput) { return window.recorder.transcribeWithDeepgram({ ...input, ...(await this.auth()) }); }
  async getTranscript(recordingId: string) { return window.recorder.getTranscript(recordingId, await this.auth()); }
  async renameTranscriptSpeakers(input: import('./types').RenameTranscriptSpeakersInput) { return window.recorder.renameTranscriptSpeakers({ ...input, ...(await this.auth()) }); }
  async assessPronunciation(input: PronunciationAssessmentInput) { return window.recorder.assessPronunciation({ ...input, ...(await this.auth()) }); }
  async analyze(input: AnalysisInput) { return window.recorder.analyzeWithLLM({ ...input, ...(await this.auth()) }); }
  async listAnalyses(recordingId: string) { return window.recorder.listAnalyses(recordingId, await this.auth()); }
  async getAnalysis(recordingId: string, analysisId?: string) { return window.recorder.getAnalysis(recordingId, analysisId, await this.auth()); }
  async exportAnalysisPdf(input: any) { return window.recorder.exportAnalysisPdf(input); }
  async createCheckoutSession() { return window.recorder.createCheckoutSession(await this.auth()); }
  async getBillingStatus() { return window.recorder.getBillingStatus(await this.auth()); }
  async createBillingPortalSession() { return window.recorder.createBillingPortalSession(await this.auth()); }
  async openBillingUrl(url: string) { await window.recorder.openStripeExternalUrl(url); }
  subscribeToRecordingsChanged(callback: () => void) {
    window.addEventListener('recordings:changed', callback);
    return () => window.removeEventListener('recordings:changed', callback);
  }
  getShortcutSettings() { return window.recorder.getShortcutSettings(); }
  setRecordShortcut(shortcut: string) { return window.recorder.setRecordShortcut(shortcut); }
  subscribeToShortcutRecord(callback: () => void) {
    window.recorder.onShortcutRecord(callback);
    return () => window.recorder.removeShortcutRecord(callback);
  }
  openMicrophoneSettings() { return window.recorder.openMicrophoneSettings(); }
}
