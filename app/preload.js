const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('recorder', {
  probe: () => ipcRenderer.invoke('recorder:probe'),
  recordSimulated: (outputDir, seconds) => ipcRenderer.invoke('recorder:record-simulated', outputDir, seconds),
  recordingsRoot: () => ipcRenderer.invoke('recordings:root'),
  listRecordings: () => ipcRenderer.invoke('recordings:list'),
  saveRecording: (recording) => ipcRenderer.invoke('recordings:save', recording),
  openRecordingsFolder: () => ipcRenderer.invoke('recordings:open-folder')
});
