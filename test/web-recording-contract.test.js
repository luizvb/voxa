const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('web recorder exposes direct microphone and shared tab or screen capture without Analyze as', () => {
  const dashboard = read('src/components/Dashboard.tsx');
  const recorder = read('src/hooks/useRecorder.ts');

  assert.match(dashboard, /captureMode: 'microphone'/);
  assert.match(dashboard, /captureMode: 'shared'/);
  assert.doesNotMatch(dashboard, /t\('recorder', 'analyzeAs'\)/);

  const displayRequest = recorder.indexOf('await navigator.mediaDevices.getDisplayMedia(options)');
  const microphoneRequest = recorder.indexOf('await navigator.mediaDevices.getUserMedia', displayRequest);
  assert.ok(displayRequest >= 0, 'shared capture must request getDisplayMedia');
  assert.ok(microphoneRequest > displayRequest, 'getDisplayMedia must preserve the initiating user gesture by running before microphone capture');
  assert.match(recorder, /systemAudio: 'include'/);
});

test('workspace welcomes the signed-in user in the selected language', () => {
  const dashboard = read('src/components/Dashboard.tsx');
  const locales = read('src/i18n/locales.ts');

  assert.match(dashboard, /useAuth\(\)/);
  assert.match(dashboard, /t\('workspace', 'greeting'\)\.replace\('\{name\}', firstName\)/);
  assert.match(dashboard, /greetingGuest/);
  assert.match(locales, /Olá, \{name\}\. Vamos começar a gravar\?/);
  assert.match(locales, /Hello, \{name\}\. Ready to start recording\?/);
  assert.match(locales, /Hola, \{name\}\. ¿Empezamos a grabar\?/);
});

test('web PDF export downloads a generated PDF without opening a blank tab', () => {
  const platform = read('src/platform/web-platform.ts');
  const pdf = read('src/lib/browser-pdf.ts');

  assert.doesNotMatch(platform, /window\.open/);
  assert.match(platform, /downloadAnalysisPdf/);
  assert.match(pdf, /createAnalysisPdfDocument\(input\)\.output\('blob'\)/);
  assert.match(pdf, /anchor\.download = fileName/);
  assert.match(pdf, /createAnalysisPdfDocument/);
  assert.match(pdf, /summary\.keyFindings/);
  assert.match(pdf, /addStatStrip/);
  assert.match(pdf, /modeEntries/);
});

test('protected recording media is loaded with auth before reaching the audio element', () => {
  const platform = read('src/platform/web-platform.ts');
  const history = read('src/components/HistoryView.tsx');

  assert.match(platform, /loadRecordingMedia/);
  assert.match(platform, /Authorization: `Bearer \$\{token\}`/);
  assert.match(platform, /URL\.createObjectURL\(blob\)/);
  assert.match(history, /platform\.loadRecordingMedia/);
  assert.match(history, /src=\{playbackSource \|\| undefined\}/);
  assert.doesNotMatch(history, /src=\{selected\.playbackUrl\}/);
});

test('transcription language is selected in the recorder and retranscription toolbar', () => {
  const dashboard = read('src/components/Dashboard.tsx');
  const history = read('src/components/HistoryView.tsx');
  const languages = read('src/lib/transcription-language.ts');

  assert.match(languages, /\['en-US', 'pt-BR', 'es'\]/);
  assert.match(dashboard, /transcription-language-field/);
  assert.match(history, /transcription-language-control/);
  assert.match(history, /language: transcriptionLanguage/);
});

test('web and Electron clients send language and wait for the asynchronous transcript', () => {
  const web = read('src/platform/web-platform.ts');
  const electron = read('app/main.js');
  const controller = read('backend/src/controllers/recordings.ts');

  assert.match(web, /language: input\.language/);
  assert.match(web, /\/status/);
  assert.match(web, /status\.state === 'ready'/);
  assert.match(electron, /language: input\.language/);
  assert.match(electron, /status\.state === 'ready'/);
  assert.match(controller, /state IN \('uploaded', 'failed', 'ready'\)/);
});

test('automatic and manual insights use the platform locale as output language', () => {
  const history = read('src/components/HistoryView.tsx');
  const backend = read('backend/src/services/llm.ts');

  assert.match(history, /language === 'pt' \? 'pt-BR' : language === 'es' \? 'es-ES' : 'en-US'/);
  assert.ok((history.match(/outputLanguage: locale/g) || []).length >= 2);
  assert.match(backend, /OUTPUT LANGUAGE CONTRACT — MANDATORY/);
  assert.match(backend, /Evidence\.quote and correction\.original are the only language exceptions/);
});

test('completed audio is committed locally before auth or network upload', () => {
  const platform = read('src/platform/web-platform.ts');
  const recovery = read('src/lib/recording-recovery.ts');
  const saveMethod = platform.slice(platform.indexOf('async saveRecording'), platform.indexOf('async importRecording'));

  assert.ok(saveMethod.indexOf('await persistRecordingDraft') < saveMethod.indexOf('retryPendingRecording'));
  assert.match(recovery, /const DATABASE_NAME = 'voxa-recording-recovery'/);
  assert.match(recovery, /transaction\.oncomplete = \(\) =>/);
  assert.match(recovery, /resolve\(result\)/);
  assert.match(platform, /await deleteRecordingDraft\(id\)/);
});

test('recording retry reuses a stable owner-scoped Blob and preserves drafts on failure', () => {
  const platform = read('src/platform/web-platform.ts');
  const backend = read('backend/src/controllers/recordings.ts');

  assert.match(platform, /recordings\/\$\{safePathSegment\(userId\)\}\/\$\{draft\.id\}\.\$\{draft\.extension\}/);
  assert.match(platform, /blobUrl: uploaded\.url, state: 'finalizing'/);
  assert.match(platform, /state: 'failed', lastError: message/);
  assert.match(backend, /allowOverwrite: ownerScoped/);
  assert.match(backend, /recordingBlobPathMatchesUser/);
  assert.match(backend, /cleanupServerUploadedBlob && uploadedBlobUrl/);
});

test('downloaded WebM audio can be imported through the protected local-first pipeline', () => {
  const app = read('src/App.tsx');
  const dialog = read('src/components/AudioImportDialog.tsx');
  const platform = read('src/platform/web-platform.ts');
  const importMethod = platform.slice(platform.indexOf('async importRecording'), platform.indexOf('async listPendingRecordings'));

  assert.match(app, /<AudioImportDialog/);
  assert.match(dialog, /accept="\.webm,audio\/webm,video\/webm"/);
  assert.match(dialog, /platform\.importRecording/);
  assert.ok(importMethod.indexOf('await persistRecordingBlobDraft') < importMethod.indexOf('return this.retryPendingRecording(id)'));
});

test('transient auth failures retry without putting protected audio at risk', () => {
  const auth = read('src/platform/auth-token.ts');

  assert.match(auth, /SESSION_RETRY_DELAYS_MS = \[300, 900\]/);
  assert.match(auth, /isTransientSessionError/);
  assert.match(auth, /Your audio remains protected locally/);
});

test('local recovery remains reachable when auth cannot restore the session after reload', () => {
  const app = read('src/App.tsx');

  assert.match(app, /localRecoveryState/);
  assert.match(app, /platform\.listPendingRecordings/);
  assert.match(app, /subscribeToPendingRecordingsChanged/);
  assert.match(app, /!isAuthenticated && !isElectronApp && localRecoveryState === 'empty'/);
});
