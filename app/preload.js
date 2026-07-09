const { contextBridge, ipcRenderer } = require('electron');

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
  analyzeWithLLM: (recordingId) => ipcRenderer.invoke('llm:analyze', { recordingId }),
  getAnalysis: (recordingId) => ipcRenderer.invoke('llm:get-analysis', { recordingId }),
  resizeWindow: (width, height) => ipcRenderer.invoke('window:resize', width, height),
  onShortcutRecord: (callback) => ipcRenderer.on('shortcut:record', callback),
  removeShortcutRecord: (callback) => ipcRenderer.removeListener('shortcut:record', callback)
});
