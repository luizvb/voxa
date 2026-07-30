const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('recordings:changed', (_event, recording) => {
  window.dispatchEvent(new CustomEvent('recordings:changed', { detail: recording }));
});

contextBridge.exposeInMainWorld('recorder', {
  probe: () => ipcRenderer.invoke('recorder:probe'),
  recordSimulated: (outputDir, seconds) => ipcRenderer.invoke('recorder:record-simulated', outputDir, seconds),
  recordingsRoot: () => ipcRenderer.invoke('recordings:root'),
  listRecordings: (input) => ipcRenderer.invoke('recordings:list', input),
  loadRecordingMedia: (recordingId, auth = {}) => ipcRenderer.invoke('recordings:media', { recordingId, ...auth }),
  saveRecording: (recording) => ipcRenderer.invoke('recordings:save', recording),
  importTranscript: (input) => ipcRenderer.invoke('recordings:import-transcript', input),
  openRecordingsFolder: () => ipcRenderer.invoke('recordings:open-folder'),
  deleteRecording: (id, auth = {}) => ipcRenderer.invoke('recordings:delete', { id, ...auth }),
  transcribeWithDeepgram: (input) => ipcRenderer.invoke('transcriptions:deepgram', input),
  getTranscript: (recordingId, auth = {}) => ipcRenderer.invoke('transcriptions:get', { recordingId, ...auth }),
  analyzeWithLLM: (input) => ipcRenderer.invoke('llm:analyze', typeof input === 'string' ? { recordingId: input } : input),
  listAnalyses: (recordingId, auth = {}) => ipcRenderer.invoke('llm:list-analyses', { recordingId, ...auth }),
  getAnalysis: (recordingId, analysisId, auth = {}) => ipcRenderer.invoke('llm:get-analysis', { recordingId, analysisId, ...auth }),
  exportAnalysisPdf: (input) => ipcRenderer.invoke('reports:analysis-pdf', input),
  createCheckoutSession: (input) => ipcRenderer.invoke('stripe:create-checkout-session', input),
  getBillingStatus: (input) => ipcRenderer.invoke('stripe:get-status', input),
  createBillingPortalSession: (input) => ipcRenderer.invoke('stripe:create-portal-session', input),
  openStripeExternalUrl: (url) => ipcRenderer.invoke('stripe:open-external-url', url),
  resizeWindow: (width, height) => ipcRenderer.invoke('window:resize', width, height),
  getShortcutSettings: () => ipcRenderer.invoke('shortcuts:get'),
  setRecordShortcut: (shortcut) => ipcRenderer.invoke('shortcuts:set-record', shortcut),
  openMicrophoneSettings: () => ipcRenderer.invoke('microphone:open-settings'),
  onShortcutRecord: (callback) => ipcRenderer.on('shortcut:record', callback),
  removeShortcutRecord: (callback) => ipcRenderer.removeListener('shortcut:record', callback),
  hideWidget: () => ipcRenderer.send('widget:hide'),
  showDashboard: () => ipcRenderer.send('app:show-dashboard')
});
