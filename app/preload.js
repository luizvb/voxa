const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('recordings:changed', (_event, recording) => {
  window.dispatchEvent(new CustomEvent('recordings:changed', { detail: recording }));
});

contextBridge.exposeInMainWorld('recorder', {
  probe: () => ipcRenderer.invoke('recorder:probe'),
  recordSimulated: (outputDir, seconds) => ipcRenderer.invoke('recorder:record-simulated', outputDir, seconds),
  recordingsRoot: () => ipcRenderer.invoke('recordings:root'),
  listRecordings: () => ipcRenderer.invoke('recordings:list'),
  saveRecording: (recording) => ipcRenderer.invoke('recordings:save', recording),
  openRecordingsFolder: () => ipcRenderer.invoke('recordings:open-folder'),
  deleteRecording: (id) => ipcRenderer.invoke('recordings:delete', id),
  transcribeWithDeepgram: (input) => ipcRenderer.invoke('transcriptions:deepgram', input),
  getTranscript: (recordingId) => ipcRenderer.invoke('transcriptions:get', { recordingId }),
  analyzeWithLLM: (input) => ipcRenderer.invoke('llm:analyze', typeof input === 'string' ? { recordingId: input } : input),
  getAnalysis: (recordingId) => ipcRenderer.invoke('llm:get-analysis', { recordingId }),
  exportAnalysisPdf: (input) => ipcRenderer.invoke('reports:analysis-pdf', input),
  resizeWindow: (width, height) => ipcRenderer.invoke('window:resize', width, height),
  getShortcutSettings: () => ipcRenderer.invoke('shortcuts:get'),
  setRecordShortcut: (shortcut) => ipcRenderer.invoke('shortcuts:set-record', shortcut),
  openMicrophoneSettings: () => ipcRenderer.invoke('microphone:open-settings'),
  onShortcutRecord: (callback) => ipcRenderer.on('shortcut:record', callback),
  removeShortcutRecord: (callback) => ipcRenderer.removeListener('shortcut:record', callback),
  hideWidget: () => ipcRenderer.send('widget:hide'),
  showDashboard: () => ipcRenderer.send('app:show-dashboard')
});
