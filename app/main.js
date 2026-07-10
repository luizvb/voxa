const path = require('node:path');
const fs = require('node:fs/promises');
const { loadEnvFile } = require('./env-loader');
const { resolveApiUrl } = require('./release-config');
const { startRendererServer } = require('./renderer-server');

loadEnvFile(path.join(__dirname, '..', '.env'));

const { app, BrowserWindow, desktopCapturer, ipcMain, session, shell, protocol, net, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const { upload } = app.isPackaged
  ? require(path.join(process.resourcesPath, 'blob-client.cjs'))
  : require('@vercel/blob/client');

let tray = null;
let isQuitting = false;
let mainWindow = null;
let widgetWindow = null;
let rendererServer = null;
let rendererOrigin = null;
const DEFAULT_RECORD_SHORTCUT = process.platform === 'darwin'
  ? 'Option+Space'
  : 'CommandOrControl+Shift+Space';
const SHORTCUT_OPTIONS = process.platform === 'darwin'
  ? ['Option+Space', 'CommandOrControl+Shift+Space', 'Option+R']
  : ['CommandOrControl+Shift+Space', 'Alt+R', 'Alt+Space'];
let recordShortcut = DEFAULT_RECORD_SHORTCUT;
let registeredRecordShortcut = null;
const { spawnFile } = require('./sidecar');
const API_URL = resolveApiUrl();
const API_TIMEOUT_MS = 20_000;
const { pathToFileURL } = require('node:url');
const requestedWindowWidth = Number.parseInt(process.env.VOXA_WINDOW_WIDTH || '', 10);
const requestedWindowHeight = Number.parseInt(process.env.VOXA_WINDOW_HEIGHT || '', 10);
const MAIN_WINDOW_WIDTH = Number.isFinite(requestedWindowWidth) ? Math.max(800, requestedWindowWidth) : 1024;
const MAIN_WINDOW_HEIGHT = Number.isFinite(requestedWindowHeight) ? Math.max(600, requestedWindowHeight) : 768;

function rendererUrl(hash = '') {
  const origin = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : rendererOrigin;

  if (!origin) throw new Error('Renderer server is not ready.');
  return `${origin}${hash ? `/#/${hash}` : ''}`;
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-media', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);

const dockIconPath = path.join(__dirname, 'dockIcon.png');

function playbackUrlFor(file) {
  return /^https:\/\//i.test(file || '') ? file : `local-media://${file}`;
}

async function fetchApi(endpoint, options = {}) {
  try {
    return await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Voxa API unavailable at ${API_URL}: ${reason}`);
  }
}

function safePathSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'local-user';
}

const showDockIcon = () => {
  if (process.platform !== 'darwin') return;

  app.setActivationPolicy('regular');
  app.dock.show();
  app.dock.setIcon(dockIconPath);
};

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');

async function readSettings() {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeSettings(nextSettings) {
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(nextSettings, null, 2));
}

function notifyRecordShortcut() {
  if (widgetWindow) {
    if (!widgetWindow.isVisible()) {
      widgetWindow.showInactive();
    }
    widgetWindow.webContents.send('shortcut:record');
  }
  if (mainWindow) {
    mainWindow.webContents.send('shortcut:record');
  }
}

function registerRecordShortcut(accelerator) {
  if (registeredRecordShortcut) {
    globalShortcut.unregister(registeredRecordShortcut);
    registeredRecordShortcut = null;
  }

  const registered = globalShortcut.register(accelerator, notifyRecordShortcut);
  if (!registered) return false;

  registeredRecordShortcut = accelerator;
  recordShortcut = accelerator;
  return true;
}

const createWidgetWindow = () => {
  if (widgetWindow) return widgetWindow;

  widgetWindow = new BrowserWindow({
    width: 360,
    height: 104,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  widgetWindow.loadURL(rendererUrl('widget'));

  widgetWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      widgetWindow.hide();
    }
    return false;
  });

  return widgetWindow;
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#FFFFFF',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 20 },
    icon: dockIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show();
  });

  mainWindow.loadURL(rendererUrl());
}

ipcMain.handle('recorder:probe', async () => {
  return spawnFile(['probe']);
});

ipcMain.handle('recorder:record-simulated', async (_event, outputDir, seconds = 2) => {
  return spawnFile(['record-simulated', '--out', outputDir, '--seconds', String(seconds)]);
});

ipcMain.handle('recordings:root', async () => {
  return path.join(app.getPath('userData'), 'recordings');
});

ipcMain.handle('recordings:list', async (_event, input = {}) => {
  try {
    const response = await fetchApi('/api/recordings', {
      headers: { 'x-user-id': input.userId || 'local-user' }
    });
    if (!response.ok) return [];
    const recordings = await response.json();
    return recordings.map((recording) => ({
      ...recording,
      playbackUrl: playbackUrlFor(recording.file)
    }));
  } catch (error) {
    console.error('Could not list recordings:', error);
    return [];
  }
});

ipcMain.handle('recordings:save', async (_event, input) => {
  const userId = input.userId || 'local-user';
  const sessionId = input.id || `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const extension = input.extension || (String(input.mimeType).includes('webm') ? 'webm' : 'audio');

  try {
    const blob = await upload(
      `recordings/${safePathSegment(userId)}/${safePathSegment(sessionId)}.${extension}`,
      Buffer.from(input.bytes),
      {
        access: 'public',
        contentType: input.mimeType || 'audio/webm',
        handleUploadUrl: `${API_URL}/api/recordings/upload`,
        headers: { 'x-user-id': userId },
        multipart: true
      }
    );

    const response = await fetchApi('/api/recordings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({
        ...input,
        bytes: undefined,
        id: sessionId,
        blobUrl: blob.url,
        sizeBytes: input.bytes?.byteLength || input.bytes?.length || 0
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Backend returned ${response.status}`);
    }

    const metadata = await response.json();
    const savedRecording = {
      ...metadata,
      playbackUrl: playbackUrlFor(metadata.file)
    };

    if (mainWindow) mainWindow.webContents.send('recordings:changed', savedRecording);
    if (widgetWindow) widgetWindow.webContents.send('recordings:changed', savedRecording);

    return savedRecording;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not save recording to Vercel Blob: ${reason}`);
  }
});

ipcMain.handle('recordings:open-folder', async () => {
  // Folder no longer heavily used, but keep backward compatibility
  const root = path.join(app.getPath('userData'), 'recordings');
  await fs.mkdir(root, { recursive: true });
  await shell.openPath(root);
  return root;
});

ipcMain.handle('recordings:delete', async (_event, id) => {
  // Mocked for now, needs backend endpoint if requested later
  return true;
});

ipcMain.handle('shortcuts:get', async () => {
  return {
    record: recordShortcut,
    options: SHORTCUT_OPTIONS
  };
});

ipcMain.handle('shortcuts:set-record', async (_event, nextShortcut) => {
  if (!SHORTCUT_OPTIONS.includes(nextShortcut)) {
    throw new Error('Unsupported shortcut');
  }

  const previousShortcut = recordShortcut;
  if (previousShortcut !== nextShortcut && !registerRecordShortcut(nextShortcut)) {
    registerRecordShortcut(previousShortcut);
    throw new Error(`${nextShortcut} is already used by another app or macOS.`);
  }

  const settings = await readSettings();
  await writeSettings({ ...settings, recordShortcut: nextShortcut });

  return {
    record: recordShortcut,
    options: SHORTCUT_OPTIONS
  };
});

ipcMain.handle('microphone:open-settings', async () => {
  if (process.platform === 'darwin') {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
    return true;
  }

  if (process.platform === 'win32') {
    await shell.openExternal('ms-settings:privacy-microphone');
    return true;
  }

  return false;
});

ipcMain.handle('transcriptions:deepgram', async (_event, input) => {
  const response = await fetchApi(`/api/recordings/${input.recordingId}/transcribe`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': input.userId || 'local-user' 
    },
    body: JSON.stringify({ maxQuality: Boolean(input.maxQuality) })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Transcription failed: ${errorBody}`);
  }
  
  return response.json();
});

ipcMain.handle('transcriptions:get', async (_event, input) => {
  // Since we don't have a GET endpoint for transcripts right now, return empty or throw
  // Normally the transcript is returned by the POST or via the list recordings
  return { markdown: '' };
});

ipcMain.handle('llm:analyze', async (_event, input) => {
  const response = await fetchApi(`/api/recordings/${input.recordingId}/analyze`, {
    method: 'POST',
    headers: { 'x-user-id': input.userId || 'local-user' }
  });

  if (!response.ok) {
    throw new Error('Analysis failed');
  }

  return response.json();
});

ipcMain.handle('llm:get-analysis', async (_event, input) => {
  return null; // Mocked
});

ipcMain.handle('window:resize', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setSize(width, height);
  }
});

ipcMain.on('widget:hide', () => {
  if (widgetWindow) {
    widgetWindow.hide();
  }
});

ipcMain.on('app:show-dashboard', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    showDockIcon();
  }
  if (widgetWindow) {
    widgetWindow.hide();
  }
});

app.whenReady().then(async () => {
  if (process.env.NODE_ENV !== 'development') {
    rendererServer = await startRendererServer(path.join(__dirname, '../dist'));
    rendererOrigin = rendererServer.origin;
  }

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
  createWidgetWindow();

  showDockIcon();

  // Create Tray
  const iconPath = path.join(__dirname, 'trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Voxa');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Recorder', click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          showDockIcon();
        }
      }
    },
    {
      label: 'Toggle Recording', click: () => {
        if (mainWindow) mainWindow.webContents.send('shortcut:record');
        if (widgetWindow) widgetWindow.webContents.send('shortcut:record');
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

  const settings = await readSettings();
  const configuredShortcut = SHORTCUT_OPTIONS.includes(settings.recordShortcut)
    ? settings.recordShortcut
    : DEFAULT_RECORD_SHORTCUT;

  if (!registerRecordShortcut(configuredShortcut) && configuredShortcut !== DEFAULT_RECORD_SHORTCUT) {
    registerRecordShortcut(DEFAULT_RECORD_SHORTCUT);
  }

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      showDockIcon();
    } else {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (rendererServer) {
    rendererServer.close().catch(() => {});
    rendererServer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
