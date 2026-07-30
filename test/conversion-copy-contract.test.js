const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const app = readFileSync('src/App.tsx', 'utf8');
const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
const login = readFileSync('src/components/Login.tsx', 'utf8');
const onboarding = readFileSync('src/components/Onboarding.tsx', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const locales = readFileSync('src/i18n/locales.ts', 'utf8');
const webPlatform = readFileSync('src/platform/web-platform.ts', 'utf8');

test('sign-in messaging is contextual and guest billing has an explicit sign-in path', () => {
  assert.match(login, /'generic' \| 'post_recording' \| 'billing' \| 'import_transcript'/);
  assert.match(login, /context === 'post_recording'/);
  assert.match(login, /context === 'billing'/);
  assert.match(app, /view === 'billing' && !isAuthenticated/);
  assert.match(app, /setLoginContext\('billing'\)/);
  assert.match(app, /setLoginContext\('post_recording'\)/);
  assert.match(app, /setLoginContext\('import_transcript'\)/);
  assert.match(app, /loginContext === 'import_transcript'/);
  assert.match(app, /setIsImportDialogOpen\(true\)/);
  assert.match(app, /aria-labelledby="auth-modal-title"/);
  assert.match(login, /id="auth-modal-title"/);
  assert.match(locales, /Access your library and saved conversations\./);
  assert.match(locales, /Acesse sua biblioteca e conversas salvas\./);
  assert.match(locales, /Accede a tu biblioteca y conversaciones guardadas\./);
  assert.match(locales, /Sign in to import a transcript/);
  assert.match(locales, /Entre para adicionar uma transcrição/);
  assert.match(locales, /Inicia sesión para agregar una transcripción/);
});

test('web capture and storage claims match the implemented capability and upload timing', () => {
  assert.match(webPlatform, /await upload\(/);
  assert.match(dashboard, /kind === 'web' \? 'cloudAfterStop' : 'localFirst'/);
  assert.match(onboarding, /kind === 'web' \? 'recordDescWeb' : 'recordDesc'/);
  assert.match(locales, /Uploaded after you stop/);
  assert.match(locales, /Enviado após encerrar a gravação/);
  assert.match(locales, /Se sube al detener la grabación/);
  assert.match(locales, /audio from a tab or screen you choose to share/);
  assert.match(locales, /áudio de uma aba ou tela que você escolher compartilhar/);
  assert.match(locales, /audio de una pestaña o pantalla que elijas compartir/);
});

test('billing conversion copy is singular, user-facing, and state-aware', () => {
  assert.doesNotMatch(locales, /View plans|Ver planos|Ver planes/);
  assert.doesNotMatch(locales, /signed webhook|webhook assinado|webhook firmado/);
  assert.doesNotMatch(locales, /More minutes|Mais minutos|Más minutos/);
  assert.match(locales, /View Voxa Pro/);
  assert.match(locales, /Ver Voxa Pro/);
  assert.match(sidebar, /case 'trial_active'/);
  assert.match(sidebar, /case 'active'/);
  assert.match(sidebar, /case 'past_due_blocked'/);
  assert.match(sidebar, /case 'checkout_pending'/);
});

test('library recovery is platform-safe and transcript import is available as a first-value alternative', () => {
  assert.doesNotMatch(locales, /Start the local service|Inicie o serviço local|Inicia el servicio local/);
  assert.match(locales, /Check your connection and try again/);
  assert.match(locales, /Confira sua conexão e tente novamente/);
  assert.match(locales, /Comprueba tu conexión e inténtalo de nuevo/);
  assert.match(dashboard, /isAuthenticated && <button[^>]+onClick=\{onImportTranscript\}/);
});
