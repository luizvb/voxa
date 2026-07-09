const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

function goRun(args) {
  const output = execFileSync('go', ['run', './cmd/recorderd', ...args], {
    cwd: root,
    encoding: 'utf8'
  });
  return JSON.parse(output);
}

test('recorderd probe returns stable cli-json-v1 contract', () => {
  const response = goRun(['probe']);

  assert.equal(response.name, 'recorderd');
  assert.equal(response.protocol, 'cli-json-v1');
  assert.ok(response.drivers.includes('simulated'));
  assert.equal(response.sampleRate, 16000);
});

test('recorderd simulated recording creates three WAV artifacts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recorderd-'));
  const response = goRun(['record-simulated', '--out', dir, '--seconds', '1']);

  assert.equal(response.frames, 16000);
  assert.equal(response.files.length, 3);

  for (const name of ['mic.wav', 'system.wav', 'mix.wav']) {
    const file = path.join(dir, name);
    assert.equal(fs.existsSync(file), true);
    assert.ok(fs.statSync(file).size > 44);
  }
});
