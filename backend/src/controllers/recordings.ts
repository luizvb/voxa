import { Request, Response } from 'express';
import db from '../config/db';
import { transcribeWithDeepgram } from '../services/transcription';
import { analyzeTranscriptWithOpenRouter } from '../services/llm';

async function ensureUser(userId: string): Promise<void> {
  await db.query(`
    INSERT INTO users (id, email) 
    VALUES ($1, $2) 
    ON CONFLICT (id) DO NOTHING
  `, [userId, 'unknown@auth0']);
}

export const uploadRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'local-user';
    await ensureUser(userId);

    const { id, name, durationMs, mode, mimeType, createdAt } = req.body;
    
    if (!req.file) {
      res.status(400).json({ error: 'No audio file uploaded.' });
      return;
    }
    
    const recordingPath = req.file.path;
    const sizeBytes = req.file.size;
    const sessionId = id || Date.now().toString();

    await db.query(`
      INSERT INTO recordings (id, user_id, name, duration_ms, size_bytes, mode, local_file_path, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        duration_ms = EXCLUDED.duration_ms,
        size_bytes = EXCLUDED.size_bytes
    `, [sessionId, userId, name, durationMs, sizeBytes, mode, recordingPath, createdAt || new Date().toISOString()]);

    res.status(201).json({ id: sessionId, name, durationMs, mode, mimeType, sizeBytes, file: recordingPath });
  } catch (error: any) {
    console.error('Error saving recording:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listRecordings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'local-user';
    const { rows } = await db.query('SELECT * FROM recordings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    
    const recordings = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      durationMs: r.duration_ms,
      mode: r.mode,
      file: r.local_file_path,
      sizeBytes: r.size_bytes
    }));
    
    res.json(recordings);
  } catch (error: any) {
    console.error('Error listing recordings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const transcribeRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'local-user';
    const { id } = req.params;
    
    const { rows } = await db.query('SELECT * FROM recordings WHERE id = $1 AND user_id = $2', [id, userId]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }
    
    const recording = rows[0];
    const apiKey = process.env.DEEPGRAM_API_KEY || '';
    
    const result = await transcribeWithDeepgram({
      apiKey,
      filePath: recording.local_file_path,
      mimeType: 'audio/webm',
      maxQuality: req.body.maxQuality
    });

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
    
    res.json({ markdown: result.markdown });
  } catch (error: any) {
    console.error('Error transcribing:', error);
    res.status(500).json({ error: error.message });
  }
};

export const analyzeRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'local-user';
    const { id } = req.params;

    const { rows: tRows } = await db.query('SELECT markdown FROM transcripts WHERE recording_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
    if (tRows.length === 0) {
      res.status(404).json({ error: 'Transcript not found for this recording' });
      return;
    }
    
    const transcript = tRows[0];
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite-preview-07-24';

    const analysisResult = await analyzeTranscriptWithOpenRouter(apiKey, transcript.markdown, model);
    
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

    res.json(analysisResult.data);
  } catch (error: any) {
    console.error('Error analyzing:', error);
    res.status(500).json({ error: error.message });
  }
};
