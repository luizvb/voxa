const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { listRecordings, recordingsRoot, saveRecording } = require('../app/session-store');

test('session store saves a recording with metadata and lists newest first', async () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'recorder-store-'));
  const first = await saveRecording(userDataPath, {
    id: '2026-07-09T10-00-00-000Z',
    name: 'First',
    createdAt: '2026-07-09T10:00:00.000Z',
    durationMs: 1000,
    mode: 'mic',
    mimeType: 'audio/webm',
    extension: 'webm',
    bytes: Buffer.from('first')
  });
  const second = await saveRecording(userDataPath, {
    id: '2026-07-09T11-00-00-000Z',
    name: 'Second',
    createdAt: '2026-07-09T11:00:00.000Z',
    durationMs: 2000,
    mode: 'mic+system',
    mimeType: 'audio/webm',
    extension: 'webm',
    bytes: Buffer.from('second')
  });

  assert.equal(first.sizeBytes, 5);
  assert.equal(second.sizeBytes, 6);
  assert.equal(fs.existsSync(second.file), true);

  const recordings = await listRecordings(userDataPath);
  assert.equal(recordings.length, 2);
  assert.equal(recordings[0].name, 'Second');
  assert.equal(recordings[1].name, 'First');
  assert.equal(path.dirname(path.dirname(recordings[0].file)), recordingsRoot(userDataPath));
});

test('session store ignores incomplete session directories', async () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'recorder-store-'));
  fs.mkdirSync(path.join(recordingsRoot(userDataPath), 'broken'), { recursive: true });

  const recordings = await listRecordings(userDataPath);
  assert.deepEqual(recordings, []);
});
