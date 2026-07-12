import { Request, Response } from 'express';
import { del, get, put } from '@vercel/blob';
import { handleUpload, HandleUploadBody } from '@vercel/blob/client';
import { waitUntil } from '@vercel/functions';
import { Readable } from 'node:stream';
import db from '../config/db';
import { transcribeWithDeepgram } from '../services/transcription';
import { analyzeTranscriptWithOpenRouter, normalizeAnalysisModes } from '../services/llm';

async function ensureUser(userId: string, email = 'unknown@voxa'): Promise<void> {
  await db.query(`
    INSERT INTO users (id, email) 
    VALUES ($1, $2) 
    ON CONFLICT (id) DO NOTHING
  `, [userId, email]);
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'local-user';
}

function isRecordingBlobUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname.endsWith('.blob.vercel-storage.com')
      && url.pathname.startsWith('/recordings/');
  } catch {
    return false;
  }
}

export const createRecordingUploadToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = safePathSegment(req.user!.id);
    const result = await handleUpload({
      request: req,
      body: req.body as HandleUploadBody,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^recordings\/[0-9a-f-]{36}\.(webm|audio)$/i.test(pathname)) {
          throw new Error('Invalid recording upload path.');
        }

        return {
          allowedContentTypes: ['audio/*', 'video/webm'],
          maximumSizeInBytes: 1024 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60
        };
      }
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error creating recording upload token:', error);
    res.status(400).json({ error: error.message || 'Could not create upload token.' });
  }
};

export const uploadRecording = async (req: Request, res: Response): Promise<void> => {
  let uploadedBlobUrl: string | null = null;
  try {
    const userId = req.user!.id;
    await ensureUser(userId, req.user?.email);

    const { id, name, durationMs, mode, mimeType, createdAt, blobUrl } = req.body;
    const sessionId = id || Date.now().toString();

    if (!req.file && !blobUrl) {
      res.status(400).json({ error: 'No audio file or Blob URL provided.' });
      return;
    }

    if (blobUrl && !isRecordingBlobUrl(blobUrl)) {
      res.status(400).json({ error: 'Invalid recording Blob URL.' });
      return;
    }

    if (blobUrl) {
      const pathname = new URL(blobUrl).pathname;
      if (!pathname.startsWith(`/recordings/${safePathSegment(sessionId)}.`)) {
        res.status(400).json({ error: 'Blob path does not match the recording ID.' });
        return;
      }
    }

    if (req.file) {
      const extension = req.file.mimetype.includes('webm') ? 'webm' : 'audio';
      const blob = await put(
        `recordings/${safePathSegment(userId)}/${safePathSegment(sessionId)}.${extension}`,
        req.file.buffer,
        {
          access: 'private',
          contentType: req.file.mimetype || 'audio/webm',
          addRandomSuffix: false,
          allowOverwrite: false
        }
      );
      uploadedBlobUrl = blob.url;
    } else {
      uploadedBlobUrl = blobUrl;
    }

    const sizeBytes = req.file?.size || Number(req.body.sizeBytes) || 0;
    const effectiveMimeType = mimeType || req.file?.mimetype || 'audio/webm';

    await db.query(`
      INSERT INTO recordings (id, user_id, name, duration_ms, size_bytes, mode, local_file_path, mime_type, state, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded', $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        duration_ms = EXCLUDED.duration_ms,
        size_bytes = EXCLUDED.size_bytes,
        mode = EXCLUDED.mode,
        local_file_path = EXCLUDED.local_file_path,
        mime_type = EXCLUDED.mime_type,
        state = CASE WHEN recordings.state = 'ready' THEN recordings.state ELSE 'uploaded' END,
        processing_error = NULL
      WHERE recordings.user_id = EXCLUDED.user_id
    `, [sessionId, userId, name, durationMs, sizeBytes, mode, uploadedBlobUrl, effectiveMimeType, createdAt || new Date().toISOString()]);

    res.status(201).json({
      id: sessionId,
      recordingId: sessionId,
      state: 'uploaded',
      resultUrl: `${process.env.APP_URL || 'http://localhost:5173'}/recordings/${sessionId}`,
      name,
      durationMs,
      mode,
      mimeType: effectiveMimeType,
      sizeBytes,
      file: undefined,
      playbackUrl: `/api/recordings/${sessionId}/media`
    });
  } catch (error: any) {
    console.error('Error saving recording:', error);
    if (uploadedBlobUrl && isRecordingBlobUrl(uploadedBlobUrl)) {
      await del(uploadedBlobUrl).catch((cleanupError) => {
        console.error('Error cleaning up orphaned recording Blob:', cleanupError);
      });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const listRecordings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { rows } = await db.query(`
      SELECT r.*,
        EXISTS (SELECT 1 FROM transcripts t WHERE t.recording_id = r.id) AS has_transcript,
        EXISTS (SELECT 1 FROM analyses a WHERE a.recording_id = r.id) AS has_analysis
      FROM recordings r
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);
    
    const recordings = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      durationMs: r.duration_ms,
      mode: r.mode,
      file: undefined,
      playbackUrl: `/api/recordings/${r.id}/media`,
      sizeBytes: r.size_bytes,
      transcript: r.has_transcript ? { ready: true } : null,
      hasAnalysis: r.has_analysis
    }));
    
    res.json(recordings);
  } catch (error: any) {
    console.error('Error listing recordings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTranscript = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { rows } = await db.query(`
      SELECT t.provider, t.markdown, t.created_at
      FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.recording_id = $1 AND r.user_id = $2
      ORDER BY t.created_at DESC
      LIMIT 1
    `, [req.params.id, userId]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }
    res.json({ provider: rows[0].provider, markdown: rows[0].markdown, createdAt: rows[0].created_at });
  } catch (error: any) {
    console.error('Error loading transcript:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const streamRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query('SELECT local_file_path, mime_type FROM recordings WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (!rows.length) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }
    const source = rows[0];
    if (!isRecordingBlobUrl(source.local_file_path)) {
      res.status(409).json({ error: 'Recording is not available from cloud storage.' });
      return;
    }
    const blob = await get(source.local_file_path, { access: 'private' });
    if (!blob) {
      res.status(404).json({ error: 'Recording blob not found' });
      return;
    }
    res.setHeader('Content-Type', source.mime_type || blob.blob.contentType || 'audio/webm');
    res.setHeader('Cache-Control', 'private, no-store');
    Readable.fromWeb(blob.stream as any).pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Could not stream recording.' });
  }
};

export const getAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { rows } = await db.query(`
      SELECT a.json_data, a.created_at
      FROM analyses a
      JOIN recordings r ON r.id = a.recording_id
      WHERE a.recording_id = $1 AND r.user_id = $2
      ORDER BY a.created_at DESC
      LIMIT 1
    `, [req.params.id, userId]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }
    res.json(rows[0].json_data);
  } catch (error: any) {
    console.error('Error loading analysis:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { rows } = await db.query(
      'DELETE FROM recordings WHERE id = $1 AND user_id = $2 RETURNING local_file_path',
      [req.params.id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }
    const file = rows[0].local_file_path;
    if (isRecordingBlobUrl(file)) await del(file).catch((error) => console.error('Could not delete recording blob:', error));
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const transcribeRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    const { rows } = await db.query(`
      UPDATE recordings
      SET state = 'transcribing', processing_error = NULL
      WHERE id = $1 AND user_id = $2 AND state IN ('uploaded', 'failed')
      RETURNING *
    `, [id, userId]);
    if (rows.length === 0) {
      const existing = await db.query('SELECT state FROM recordings WHERE id = $1 AND user_id = $2', [id, userId]);
      if (existing.rows.length === 0) res.status(404).json({ error: 'Recording not found' });
      else res.status(202).json({ recordingId: id, state: existing.rows[0].state });
      return;
    }

    const job = runTranscription(rows[0], userId, Boolean(req.body?.maxQuality));
    if (process.env.VERCEL) waitUntil(job);
    else void job;
    res.status(202).json({ recordingId: id, state: 'transcribing' });
  } catch (error: any) {
    console.error('Error transcribing:', error);
    res.status(500).json({ error: error.message });
  }
};

async function runTranscription(recording: any, userId: string, maxQuality: boolean): Promise<void> {
  try {
    let audio: Buffer | undefined;
    if (/^https:\/\//i.test(recording.local_file_path)) {
      const blob = await get(recording.local_file_path, { access: 'private' });
      if (!blob) throw new Error('Recording blob was not found.');
      audio = Buffer.from(await new Response(blob.stream).arrayBuffer());
    }
    const result = await transcribeWithDeepgram({
      apiKey: process.env.DEEPGRAM_API_KEY || '',
      filePath: audio ? undefined : recording.local_file_path,
      audio,
      mimeType: recording.mime_type || 'audio/webm',
      maxQuality
    });
    await db.query('BEGIN');
    try {
      await db.query(`
        INSERT INTO transcripts (recording_id, provider, markdown)
        VALUES ($1, $2, $3)
        ON CONFLICT (recording_id, provider) DO UPDATE SET markdown = EXCLUDED.markdown, created_at = NOW()
      `, [recording.id, result.provider, result.markdown]);
      await db.query(`
        INSERT INTO usage_logs (user_id, resource_type, provider, quantity, estimated_cost_usd)
        VALUES ($1, 'transcription', $2, $3, $4)
      `, [userId, result.provider, result.usage.durationSeconds, result.usage.costUsd]);
      await db.query("UPDATE recordings SET state = 'ready', processing_error = NULL WHERE id = $1 AND user_id = $2", [recording.id, userId]);
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    await db.query("UPDATE recordings SET state = 'failed', processing_error = $3 WHERE id = $1 AND user_id = $2", [recording.id, userId, error instanceof Error ? error.message.slice(0, 500) : 'Transcription failed.']);
  }
}

export const getRecordingStatus = async (req: Request, res: Response): Promise<void> => {
  const { rows } = await db.query('SELECT state, processing_error FROM recordings WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  if (!rows.length) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }
  res.json({
    recordingId: req.params.id,
    state: rows[0].state,
    error: rows[0].processing_error || undefined,
    resultUrl: `${process.env.APP_URL || 'http://localhost:5173'}/recordings/${req.params.id}`
  });
};

export const analyzeRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { rows: tRows } = await db.query(`
      SELECT t.markdown
      FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.recording_id = $1 AND r.user_id = $2
      ORDER BY t.created_at DESC
      LIMIT 1
    `, [id, userId]);
    if (tRows.length === 0) {
      res.status(404).json({ error: 'Transcript not found for this recording' });
      return;
    }
    
    const transcript = tRows[0];
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-3.1-flash-lite';

    const modes = normalizeAnalysisModes(req.body?.modes);
    const outputLanguage = typeof req.body?.outputLanguage === 'string' ? req.body.outputLanguage : 'pt-BR';
    const context = typeof req.body?.context === 'string' ? req.body.context : '';
    const analysisResult = await analyzeTranscriptWithOpenRouter(apiKey, transcript.markdown, model, {
      modes,
      outputLanguage,
      context
    });
    
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
