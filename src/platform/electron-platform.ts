import { getAuthCredentials } from './auth-token';
import type { AnalysisInput, SaveRecordingInput, TranscriptionInput, VoxaPlatform } from './types';

export class ElectronPlatform implements VoxaPlatform {
  capabilities = { kind: 'electron' as const, systemAudio: true, globalShortcuts: true, widget: true, localFolder: true, nativePdf: true };

  private auth() { return getAuthCredentials(); }

  async listRecordings() { return window.recorder.listRecordings(await this.auth()); }
  async saveRecording(input: SaveRecordingInput) { return window.recorder.saveRecording({ ...input, ...(await this.auth()) }); }
  async importTranscript(input: { name: string; transcript: string }) { return window.recorder.importTranscript({ ...input, ...(await this.auth()) }); }
  async deleteRecording(id: string) { await window.recorder.deleteRecording(id, await this.auth()); }
  async transcribe(input: TranscriptionInput) { return window.recorder.transcribeWithDeepgram({ ...input, ...(await this.auth()) }); }
  async getTranscript(recordingId: string) { return window.recorder.getTranscript(recordingId, await this.auth()); }
  async analyze(input: AnalysisInput) { return window.recorder.analyzeWithLLM({ ...input, ...(await this.auth()) }); }
  async getAnalysis(recordingId: string) { return window.recorder.getAnalysis(recordingId, await this.auth()); }
  async exportAnalysisPdf(input: any) { return window.recorder.exportAnalysisPdf(input); }
  async createCheckoutSession() { return window.recorder.createCheckoutSession(await this.auth()); }
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
