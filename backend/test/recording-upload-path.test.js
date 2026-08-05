const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isOwnerScopedRecordingPath,
  recordingBlobPathMatchesUser,
} = require('../dist/controllers/recordings');

const recordingId = '8f1425e5-2f68-4c1c-90a7-16575fd2f1bf';
const blobHost = 'https://voxa.public.blob.vercel-storage.com';

test('owner-scoped recording paths are exact and isolated by user', () => {
  assert.equal(isOwnerScopedRecordingPath(`recordings/user-a/${recordingId}.webm`, 'user-a'), true);
  assert.equal(isOwnerScopedRecordingPath(`/recordings/user-a/${recordingId}.audio`, 'user-a'), true);
  assert.equal(isOwnerScopedRecordingPath(`recordings/user-b/${recordingId}.webm`, 'user-a'), false);
  assert.equal(isOwnerScopedRecordingPath(`recordings/user-a/${recordingId}.webm.extra`, 'user-a'), false);
  assert.equal(isOwnerScopedRecordingPath('recordings/user-a/not-a-uuid.webm', 'user-a'), false);
});

test('recording metadata only accepts the exact owner Blob or a legacy exact path', () => {
  assert.equal(recordingBlobPathMatchesUser(`${blobHost}/recordings/user-a/${recordingId}.webm`, recordingId, 'user-a'), true);
  assert.equal(recordingBlobPathMatchesUser(`${blobHost}/recordings/${recordingId}.webm`, recordingId, 'user-a'), true);
  assert.equal(recordingBlobPathMatchesUser(`${blobHost}/recordings/user-b/${recordingId}.webm`, recordingId, 'user-a'), false);
  assert.equal(recordingBlobPathMatchesUser(`${blobHost}/recordings/user-a/${recordingId}.webm.extra`, recordingId, 'user-a'), false);
  assert.equal(recordingBlobPathMatchesUser(`https://example.com/recordings/user-a/${recordingId}.webm`, recordingId, 'user-a'), false);
});
