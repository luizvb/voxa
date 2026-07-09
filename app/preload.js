const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('recorder', {
  probe: () => ipcRenderer.invoke('recorder:probe'),
  recordSimulated: (outputDir, seconds) => ipcRenderer.invoke('recorder:record-simulated', outputDir, seconds),
  recordingsRoot: () => ipcRenderer.invoke('recordings:root'),
  listRecordings: () => ipcRenderer.invoke('recordings:list'),
  saveRecording: (recording) => ipcRenderer.invoke('recordings:save', recording),
  openRecordingsFolder: () => ipcRenderer.invoke('recordings:open-folder'),
  transcribeWithDeepgram: (input) => ipcRenderer.invoke('transcriptions:deepgram', input),
  getTranscript: (recordingId) => ipcRenderer.invoke('transcriptions:get', { recordingId }),
  resizeWindow: (width, height) => ipcRenderer.invoke('window:resize', width, height)
});
