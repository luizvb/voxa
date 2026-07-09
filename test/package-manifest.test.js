const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('macOS package manifest declares microphone and audio-capture usage strings', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const extendInfo = pkg.build.mac.extendInfo;

  assert.match(extendInfo.NSMicrophoneUsageDescription, /microphone/i);
  assert.match(extendInfo.NSAudioCaptureUsageDescription, /system audio/i);
});

test('package exposes build and test scripts for Go sidecar', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['build:go'], 'go build -o bin/recorderd ./cmd/recorderd');
  assert.match(pkg.scripts['test:go'], /go test/);
});

test('renderer page allows local media playback and loads recorder controls', () => {
  const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'app', 'preload.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'app', 'renderer.js'), 'utf8');

  assert.match(html, /media-src 'self' file: blob:/);
  assert.match(html, /id="start"/);
  assert.match(html, />Record</);
  assert.match(html, /id="historyList"/);
  assert.match(html, /id="recordCount"/);
  assert.match(html, /id="captureMode"/);
  assert.match(html, /id="storagePath"/);
  assert.match(html, /VoiceDesk/);
  assert.match(html, /<audio id="player" controls>/);
  assert.match(preload, /saveRecording/);
  assert.match(preload, /listRecordings/);
  assert.match(renderer, /updateCaptureMode/);
  assert.match(renderer, /recordCount\.textContent/);
  assert.match(renderer, /Preparing recording permissions/);
  assert.match(renderer, /System audio unavailable; recording microphone only/);
  assert.match(renderer, /audioContext.resume/);
  assert.match(renderer, /width: 16/);
  assert.match(renderer, /height: 16/);
  assert.match(renderer, /mode: activeMode/);
  assert.doesNotMatch(renderer, /\blet recorder\b/);
  assert.match(renderer, /\blet mediaRecorder\b/);
});
