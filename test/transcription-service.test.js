const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.resolve(__dirname, '../backend/src/services/transcription.ts'), 'utf8');

test('Deepgram transcription uses Nova-3, current diarization and utterance segmentation for every quality level', () => {
  assert.match(source, /model: "nova-3"/);
  assert.match(source, /diarize_model: "latest"/);
  assert.match(source, /utterances: "true"/);
  assert.match(source, /if \(maxQuality\) \{\s*params\.set\("paragraphs", "true"\)/);
});

test('transcript markdown prefers speaker-labelled utterances and preserves word fallback', () => {
  assert.match(source, /const utterances = transcript\.results\?\.utterances \|\| \[\]/);
  assert.match(source, /previous\?\.speaker === speaker/);
  assert.match(source, /turn\.transcripts\.join\(" "\)/);
  assert.match(source, /const words =/);
  assert.match(source, /word\.speaker !== currentSpeaker/);
});

test('transcription still fails clearly when the API key is missing', () => {
  assert.match(source, /Missing DEEPGRAM_API_KEY/);
});
