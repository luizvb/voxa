const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('./db');

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

// Helper to ensure the user exists before inserting records to satisfy FK
async function ensureUser(userId) {
  await db.query(`
    INSERT INTO users (id, email) 
    VALUES ($1, $2) 
    ON CONFLICT (id) DO NOTHING
  `, [userId, 'unknown@auth0']);
}

async function saveRecording(userDataPath, input) {
  const { userId = 'local-user' } = input;
  await ensureUser(userId);

  const now = new Date();
  const id = input.id || createSessionId(now);
  const root = await ensureRecordingsRoot(userDataPath);
  const sessionDir = path.join(root, id);
  await fs.mkdir(sessionDir, { recursive: true });

  const extension = input.extension || 'webm';
  const recordingPath = path.join(sessionDir, `recording.${extension}`);
  await fs.writeFile(recordingPath, Buffer.from(input.bytes));

  const name = input.name || `Recording ${now.toLocaleString()}`;
  const createdAt = input.createdAt || now.toISOString();
  const durationMs = input.durationMs || 0;
  const mode = input.mode || 'mic+system';
  const mimeType = input.mimeType || 'audio/webm';
  const sizeBytes = Buffer.byteLength(Buffer.from(input.bytes));

  await db.query(`
    INSERT INTO recordings (id, user_id, name, duration_ms, size_bytes, mode, local_file_path, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      duration_ms = EXCLUDED.duration_ms,
      size_bytes = EXCLUDED.size_bytes
  `, [id, userId, name, durationMs, sizeBytes, mode, recordingPath, createdAt]);

  return { id, name, createdAt, durationMs, mode, mimeType, file: recordingPath, sizeBytes };
}

async function getRecording(userDataPath, id) {
  const { rows } = await db.query('SELECT * FROM recordings WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  const r = rows[0];
  
  const { rows: tRows } = await db.query('SELECT provider FROM transcripts WHERE recording_id = $1', [id]);
  const { rows: aRows } = await db.query('SELECT id FROM analyses WHERE recording_id = $1', [id]);
  
  return {
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    durationMs: r.duration_ms,
    mode: r.mode,
    mimeType: 'audio/webm',
    file: r.local_file_path,
    sizeBytes: r.size_bytes,
    hasTranscript: tRows.length > 0,
    hasAnalysis: aRows.length > 0,
    transcript: tRows.length > 0 ? { provider: tRows[0].provider } : null
  };
}

async function saveTranscript(userDataPath, input) {
  const { id, result, userId = 'local-user' } = input;
  await ensureUser(userId);
  
  const root = await ensureRecordingsRoot(userDataPath);
  const sessionDir = path.join(root, id);
  const transcriptPath = path.join(sessionDir, 'transcript.deepgram.json');
  const markdownPath = path.join(sessionDir, 'transcript.md');

  await fs.writeFile(transcriptPath, JSON.stringify(result.transcript, null, 2));
  await fs.writeFile(markdownPath, result.markdown);

  await db.query(`
    INSERT INTO transcripts (recording_id, provider, markdown)
    VALUES ($1, $2, $3)
  `, [id, result.provider, result.markdown]);

  if (result.usage) {
    await db.query(`
      INSERT INTO usage_logs (user_id, resource_type, provider, quantity, estimated_cost_usd)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, 'transcription', result.provider, result.usage.durationSeconds, result.usage.costUsd]);
  }

  const metadata = await getRecording(userDataPath, id);
  return { metadata, markdown: result.markdown };
}

async function getTranscript(userDataPath, id) {
  const metadata = await getRecording(userDataPath, id);
  const { rows } = await db.query('SELECT markdown FROM transcripts WHERE recording_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
  return {
    metadata,
    markdown: rows.length > 0 ? rows[0].markdown : ''
  };
}

async function listRecordings(userDataPath, userId = 'local-user') {
  const { rows } = await db.query('SELECT * FROM recordings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    durationMs: r.duration_ms,
    mode: r.mode,
    file: r.local_file_path,
    sizeBytes: r.size_bytes
  }));
}

async function deleteRecording(userDataPath, id) {
  await db.query('DELETE FROM recordings WHERE id = $1', [id]);
  const root = await ensureRecordingsRoot(userDataPath);
  const sessionDir = path.join(root, id);
  await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {});
  return true;
}

async function saveAnalysis(userDataPath, input) {
  const { id, analysisResult, userId = 'local-user' } = input;
  await ensureUser(userId);

  const root = await ensureRecordingsRoot(userDataPath);
  const sessionDir = path.join(root, id);
  const analysisPath = path.join(sessionDir, 'analysis.json');
  await fs.writeFile(analysisPath, JSON.stringify(analysisResult.data, null, 2));

  await db.query(`
    INSERT INTO analyses (recording_id, json_data)
    VALUES ($1, $2)
  `, [id, analysisResult.data]);

  if (analysisResult.usage) {
    await db.query(`
      INSERT INTO usage_logs (user_id, resource_type, provider, quantity, estimated_cost_usd)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, 'llm', 'openrouter', analysisResult.usage.totalTokens, analysisResult.usage.costUsd]);
  }

  return analysisResult.data;
}

async function getAnalysis(userDataPath, id) {
  const { rows } = await db.query('SELECT json_data FROM analyses WHERE recording_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
  return rows.length > 0 ? rows[0].json_data : null;
}

module.exports = {
  createSessionId,
  getRecording,
  getTranscript,
  listRecordings,
  recordingsRoot,
  saveRecording,
  saveTranscript,
  deleteRecording,
  saveAnalysis,
  getAnalysis
};
