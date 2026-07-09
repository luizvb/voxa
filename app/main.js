const { app, BrowserWindow, desktopCapturer, ipcMain, session, shell } = require('electron');
const { spawnFile } = require('./sidecar');
const { listRecordings, recordingsRoot, saveRecording } = require('./session-store');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function createWindow() {
  const win = new BrowserWindow({
    width: 860,
    height: 560,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
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
    playbackUrl: pathToFileURL(recording.file).toString()
  }));
});

ipcMain.handle('recordings:save', async (_event, input) => {
  const metadata = await saveRecording(app.getPath('userData'), {
    ...input,
    bytes: Buffer.from(input.bytes)
  });

  return {
    ...metadata,
    playbackUrl: pathToFileURL(metadata.file).toString()
  };
});

ipcMain.handle('recordings:open-folder', async () => {
  const root = recordingsRoot(app.getPath('userData'));
  await shell.openPath(root);
  return root;
});

app.whenReady().then(() => {
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
