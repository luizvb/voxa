import { getAuthCredentials } from './auth-token';
import type { AnalysisInput, Recording, RecordingMediaSource, SaveRecordingInput, TranscriptionInput, VoxaPlatform } from './types';

export class ElectronPlatform implements VoxaPlatform {
  capabilities = { kind: 'electron' as const, systemAudio: true, globalShortcuts: true, widget: true, localFolder: true, nativePdf: true };

  private auth() { return getAuthCredentials(); }

  async listRecordings() { return window.recorder.listRecordings(await this.auth()); }
  async saveRecording(input: SaveRecordingInput) { return window.recorder.saveRecording({ ...input, ...(await this.auth()) }); }
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
