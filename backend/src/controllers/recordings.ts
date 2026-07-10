import { Request, Response } from 'express';
import { del, put } from '@vercel/blob';
import { handleUpload, HandleUploadBody } from '@vercel/blob/client';
import db from '../config/db';
import { transcribeWithDeepgram } from '../services/transcription';
import { analyzeTranscriptWithOpenRouter, normalizeAnalysisModes } from '../services/llm';

async function ensureUser(userId: string): Promise<void> {
  await db.query(`
    INSERT INTO users (id, email) 
    VALUES ($1, $2) 
    ON CONFLICT (id) DO NOTHING
  `, [userId, 'unknown@auth0']);
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
    const userId = safePathSegment(req.user?.id || 'local-user');
    const result = await handleUpload({
      request: req,
      body: req.body as HandleUploadBody,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`recordings/${userId}/`)) {
          throw new Error('Invalid recording upload path.');
        }

        return {
          allowedContentTypes: ['audio/*', 'video/webm'],
          maximumSizeInBytes: 1024 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 60
        };
      },
      onUploadCompleted: async () => {
        // Metadata is registered by POST /api/recordings after the direct upload resolves.
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
    const userId = req.user?.id || 'local-user';
    await ensureUser(userId);

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

    if (req.file) {
      const extension = req.file.mimetype.includes('webm') ? 'webm' : 'audio';
      const blob = await put(
        `recordings/${safePathSegment(userId)}/${safePathSegment(sessionId)}.${extension}`,
        req.file.buffer,
        {
          access: 'public',
          contentType: req.file.mimetype || 'audio/webm',
          addRandomSuffix: false,
          allowOverwrite: true
        }
      );
      uploadedBlobUrl = blob.url;
    } else {
      uploadedBlobUrl = blobUrl;
    }

    const sizeBytes = req.file?.size || Number(req.body.sizeBytes) || 0;
    const effectiveMimeType = mimeType || req.file?.mimetype || 'audio/webm';

    await db.query(`
      INSERT INTO recordings (id, user_id, name, duration_ms, size_bytes, mode, local_file_path, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        duration_ms = EXCLUDED.duration_ms,
        size_bytes = EXCLUDED.size_bytes,
        mode = EXCLUDED.mode,
        local_file_path = EXCLUDED.local_file_path
    `, [sessionId, userId, name, durationMs, sizeBytes, mode, uploadedBlobUrl, createdAt || new Date().toISOString()]);

    res.status(201).json({
      id: sessionId,
      name,
      durationMs,
      mode,
      mimeType: effectiveMimeType,
      sizeBytes,
      file: uploadedBlobUrl,
      playbackUrl: uploadedBlobUrl
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
    const userId = req.user?.id || 'local-user';
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
      file: r.local_file_path,
      playbackUrl: r.local_file_path,
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
    const userId = req.user?.id || 'local-user';
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

export const getAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'local-user';
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
    const userId = req.user?.id || 'local-user';
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
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite-preview-07-24';

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
