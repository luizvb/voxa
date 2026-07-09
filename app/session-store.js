const fs = require('node:fs/promises');
const path = require('node:path');

function recordingsRoot(userDataPath) {
  return path.join(userDataPath, 'recordings');
}

function createSessionId(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function ensureRecordingsRoot(userDataPath) {
  const root = recordingsRoot(userDataPath);
  await fs.mkdir(root, { recursive: true });
  return root;
}

async function saveRecording(userDataPath, input) {
  const now = new Date();
  const id = input.id || createSessionId(now);
  const root = await ensureRecordingsRoot(userDataPath);
  const sessionDir = path.join(root, id);
  await fs.mkdir(sessionDir, { recursive: true });

  const extension = input.extension || 'webm';
  const recordingPath = path.join(sessionDir, `recording.${extension}`);
  await fs.writeFile(recordingPath, Buffer.from(input.bytes));

  const metadata = {
    id,
    name: input.name || `Recording ${now.toLocaleString()}`,
    createdAt: input.createdAt || now.toISOString(),
    durationMs: input.durationMs || 0,
    mode: input.mode || 'mic+system',
    mimeType: input.mimeType || 'audio/webm',
    file: recordingPath,
    sizeBytes: Buffer.byteLength(Buffer.from(input.bytes))
  };

  await fs.writeFile(path.join(sessionDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  return metadata;
}

async function listRecordings(userDataPath) {
  const root = await ensureRecordingsRoot(userDataPath);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const recordings = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const metadataPath = path.join(root, entry.name, 'metadata.json');
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      recordings.push(metadata);
    } catch {
      // Ignore incomplete session directories.
    }
  }

  recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return recordings;
}

module.exports = {
  createSessionId,
  listRecordings,
  recordingsRoot,
  saveRecording
};
