const path = require('node:path');
const { loadEnvFile } = require('./env-loader');

loadEnvFile(path.join(__dirname, '..', '.env'));

const { app, BrowserWindow, desktopCapturer, ipcMain, session, shell, protocol, net } = require('electron');
const { spawnFile } = require('./sidecar');
const { getRecording, getTranscript, listRecordings, recordingsRoot, saveRecording, saveTranscript } = require('./session-store');
const { transcribeWithDeepgram } = require('./transcription-service');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-media', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 860,
    height: 560,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

ipcMain.handle('recorder:probe', async () => {
  return spawnFile(['probe']);
});

ipcMain.handle('recorder:record-simulated', async (_event, outputDir, seconds = 2) => {
  return spawnFile(['record-simulated', '--out', outputDir, '--seconds', String(seconds)]);
});

ipcMain.handle('recordings:root', async () => {
  return recordingsRoot(app.getPath('userData'));
});

ipcMain.handle('recordings:list', async () => {
  const recordings = await listRecordings(app.getPath('userData'));
  return recordings.map((recording) => ({
    ...recording,
    playbackUrl: `local-media://${recording.file}`
  }));
});

ipcMain.handle('recordings:save', async (_event, input) => {
  const metadata = await saveRecording(app.getPath('userData'), {
    ...input,
    bytes: Buffer.from(input.bytes)
  });

  return {
    ...metadata,
    playbackUrl: `local-media://${metadata.file}`
  };
});

ipcMain.handle('recordings:open-folder', async () => {
  const root = recordingsRoot(app.getPath('userData'));
  await shell.openPath(root);
  return root;
});

ipcMain.handle('transcriptions:deepgram', async (_event, input) => {
  const recording = await getRecording(app.getPath('userData'), input.recordingId);
  const result = await transcribeWithDeepgram({
    apiKey: process.env.DEEPGRAM_API_KEY,
    filePath: recording.file,
    mimeType: recording.mimeType,
    maxQuality: Boolean(input.maxQuality)
  });

  return saveTranscript(app.getPath('userData'), input.recordingId, result);
});

ipcMain.handle('transcriptions:get', async (_event, input) => {
  return getTranscript(app.getPath('userData'), input.recordingId);
});

ipcMain.handle('window:resize', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setSize(width, height);
  }
});

app.whenReady().then(() => {
  protocol.handle('local-media', (request) => {
    return net.fetch('file://' + request.url.replace('local-media://', ''));
  });

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' });
    }).catch(() => {
      callback({});
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
