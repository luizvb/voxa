const path = require('node:path');
const { loadEnvFile } = require('./env-loader');

loadEnvFile(path.join(__dirname, '..', '.env'));

const { app, BrowserWindow, desktopCapturer, ipcMain, session, shell, protocol, net, Tray, Menu, globalShortcut, nativeImage } = require('electron');

let tray = null;
let isQuitting = false;
const { spawnFile } = require('./sidecar');
const { getRecording, getTranscript, listRecordings, recordingsRoot, saveRecording, saveTranscript, deleteRecording, saveAnalysis, getAnalysis } = require('./session-store');
const { transcribeWithDeepgram } = require('./transcription-service');
const { analyzeTranscriptWithOpenRouter } = require('./openrouter-service');
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

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
    return false;
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

ipcMain.handle('recordings:delete', async (_event, id) => {
  return deleteRecording(app.getPath('userData'), id);
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

ipcMain.handle('llm:analyze', async (_event, input) => {
  const { recordingId } = input;
  const transcript = await getTranscript(app.getPath('userData'), recordingId);

  if (!transcript || !transcript.markdown) {
    throw new Error('No transcript available to analyze.');
  }

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite-preview-07-24';
  const apiKey = process.env.OPENROUTER_API_KEY;

  const analysis = await analyzeTranscriptWithOpenRouter(apiKey, transcript.markdown, model);
  return saveAnalysis(app.getPath('userData'), recordingId, analysis);
});

ipcMain.handle('llm:get-analysis', async (_event, input) => {
  return getAnalysis(app.getPath('userData'), input.recordingId);
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

  // Create Tray
  const iconPath = path.join(__dirname, 'trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Voxa');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Recorder', click: () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.show();
          win.focus();
        }
      }
    },
    {
      label: 'Toggle Recording', click: () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.send('shortcut:record');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit', click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  // Global Shortcut
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('shortcut:record');
    }
  });

  app.on('activate', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.show();
      win.focus();
    } else {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
