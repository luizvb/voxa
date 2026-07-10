const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { startRendererServer } = require('../app/renderer-server');

test('renderer server exposes the packaged app from a loopback HTTP origin', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'voxa-renderer-'));
  await fs.mkdir(path.join(root, 'assets'));
  await fs.writeFile(path.join(root, 'index.html'), '<main>Voxa</main>');
  await fs.writeFile(path.join(root, 'assets', 'app.js'), 'window.voxa = true;');

  const renderer = await startRendererServer(root);
  t.after(async () => {
    await renderer.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  assert.match(renderer.origin, /^http:\/\/127\.0\.0\.1:\d+$/);

  const pageResponse = await fetch(`${renderer.origin}/settings`);
  assert.equal(pageResponse.status, 200);
  assert.equal(await pageResponse.text(), '<main>Voxa</main>');
  assert.match(pageResponse.headers.get('content-type'), /^text\/html/);

  const assetResponse = await fetch(`${renderer.origin}/assets/app.js`);
  assert.equal(assetResponse.status, 200);
  assert.equal(await assetResponse.text(), 'window.voxa = true;');
  assert.match(assetResponse.headers.get('content-type'), /^text\/javascript/);
});
