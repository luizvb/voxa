import { Request, Response } from 'express';
import { del, get, put } from '@vercel/blob';
import { handleUpload, HandleUploadBody } from '@vercel/blob/client';
import { waitUntil } from '@vercel/functions';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import db from '../config/db';
import { normalizeTranscriptionLanguage, transcribeWithDeepgram, type TranscriptionLanguage } from '../services/transcription';
import { analyzeTranscriptWithOpenRouter, configuredAnalysisModel, extractSpeakerLabels, normalizeAnalysisModes, normalizeAnalysisOutputLanguage, normalizeSelectedSpeakers } from '../services/llm';
import { assessEnglishPronunciation, inspectPronunciationWav, pronunciationAudioHash } from '../services/pronunciation';

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

export const importTranscript = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const markdown = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
  if (!name || name.length > 255) {
    res.status(400).json({ error: 'Conversation title is required and must be at most 255 characters.' });
    return;
  }
  if (!markdown || markdown.length > 100_000) {
    res.status(400).json({ error: 'Transcript is required and must be at most 100,000 characters.' });
    return;
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  try {
    await ensureUser(userId, req.user?.email);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO recordings (id, user_id, name, duration_ms, size_bytes, mode, local_file_path, mime_type, state, created_at)
        VALUES ($1, $2, $3, 0, 0, 'transcript-import', NULL, NULL, 'ready', $4)
      `, [id, userId, name, createdAt]);
      await client.query(`
        INSERT INTO transcripts (recording_id, provider, markdown)
        VALUES ($1, 'imported', $2)
      `, [id, markdown]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.status(201).json({
      id,
      name,
      createdAt,
      durationMs: 0,
      mode: 'transcript-import',
      sizeBytes: 0,
      hasAudio: false,
      playbackUrl: undefined,
      transcript: { ready: true },
      speakers: extractSpeakerLabels(markdown)
    });
  } catch (error: any) {
    console.error('Error importing transcript:', error);
    res.status(500).json({ error: error.message || 'Could not import transcript.' });
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
      hasAudio: Boolean(r.local_file_path),
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
      SELECT t.id, t.provider, t.language, t.markdown, t.created_at
      FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.recording_id = $1 AND r.user_id = $2
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT 1
    `, [req.params.id, userId]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }
    const transcript = rows[0];
    const { rows: segmentRows } = await db.query(`
      SELECT
        s.id, s.position, s.speaker, s.text, s.start_ms, s.end_ms,
        latest.id AS assessment_id,
        latest.json_data AS assessment_data,
        latest.created_at AS assessment_created_at
      FROM transcript_segments s
      LEFT JOIN LATERAL (
        SELECT pa.id, pa.json_data, pa.created_at
        FROM pronunciation_assessments pa
        WHERE pa.segment_id = s.id
        ORDER BY pa.created_at DESC, pa.id DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE s.transcript_id = $1
      ORDER BY s.position
    `, [transcript.id]);
    res.json({
      provider: transcript.provider,
      language: transcript.language,
      markdown: transcript.markdown,
      createdAt: transcript.created_at,
      speakers: extractSpeakerLabels(transcript.markdown),
      segments: segmentRows.map((segment: any) => ({
        id: segment.id,
        position: segment.position,
        speaker: segment.speaker,
        text: segment.text,
        startMs: segment.start_ms,
        endMs: segment.end_ms,
        assessment: segment.assessment_id ? {
          id: segment.assessment_id,
          ...segment.assessment_data,
          createdAt: segment.assessment_created_at
        } : null
      }))
    });
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

export const listAnalyses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { rows } = await db.query(`
      SELECT
        a.id,
        a.created_at,
        COALESCE(a.json_data->'analysisModes', '[]'::jsonb) AS analysis_modes
      FROM analyses a
      JOIN recordings r ON r.id = a.recording_id
      WHERE a.recording_id = $1 AND r.user_id = $2
      ORDER BY a.created_at DESC, a.id DESC
    `, [req.params.id, userId]);

    res.json(rows.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      modes: Array.isArray(row.analysis_modes) ? row.analysis_modes : []
    })));
  } catch (error: any) {
    console.error('Error listing analyses:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAnalysisById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { rows } = await db.query(`
      SELECT a.json_data
      FROM analyses a
      JOIN recordings r ON r.id = a.recording_id
      WHERE a.recording_id = $1 AND a.id = $2 AND r.user_id = $3
      LIMIT 1
    `, [req.params.id, req.params.analysisId, userId]);
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
    let language: TranscriptionLanguage;
    try {
      language = normalizeTranscriptionLanguage(req.body?.language);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unsupported transcription language.' });
      return;
    }
    
    const { rows } = await db.query(`
      UPDATE recordings
      SET state = 'transcribing', processing_error = NULL
      WHERE id = $1 AND user_id = $2 AND state IN ('uploaded', 'failed', 'ready')
      RETURNING *
    `, [id, userId]);
    if (rows.length === 0) {
      const existing = await db.query('SELECT state FROM recordings WHERE id = $1 AND user_id = $2', [id, userId]);
      if (existing.rows.length === 0) res.status(404).json({ error: 'Recording not found' });
      else res.status(202).json({ recordingId: id, state: existing.rows[0].state });
      return;
    }

    const job = runTranscription(rows[0], userId, Boolean(req.body?.maxQuality), language);
    if (process.env.VERCEL) waitUntil(job);
    else void job;
    res.status(202).json({ recordingId: id, state: 'transcribing' });
  } catch (error: any) {
    console.error('Error transcribing:', error);
    res.status(500).json({ error: error.message });
  }
};

async function runTranscription(recording: any, userId: string, maxQuality: boolean, language: TranscriptionLanguage): Promise<void> {
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
      language,
      maxQuality
    });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: transcriptRows } = await client.query(`
        INSERT INTO transcripts (recording_id, provider, language, markdown)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [recording.id, result.provider, result.language, result.markdown]);
      const transcriptId = transcriptRows[0].id;
      for (const [position, segment] of result.segments.entries()) {
        await client.query(`
          INSERT INTO transcript_segments (transcript_id, position, speaker, text, start_ms, end_ms)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [transcriptId, position, segment.speaker, segment.text, segment.startMs, segment.endMs]);
      }
      await client.query(`
        INSERT INTO usage_logs (user_id, resource_type, provider, quantity, estimated_cost_usd)
        VALUES ($1, 'transcription', $2, $3, $4)
      `, [userId, result.provider, result.usage.durationSeconds, result.usage.costUsd]);
      await client.query("UPDATE recordings SET state = 'ready', processing_error = NULL WHERE id = $1 AND user_id = $2", [recording.id, userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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

export const assessSegmentPronunciation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file?.buffer?.length) {
      res.status(400).json({ error: 'A pronunciation clip is required.' });
      return;
    }
    const { rows } = await db.query(`
      SELECT s.id, s.text, s.start_ms, s.end_ms, t.language, r.duration_ms
      FROM transcript_segments s
      JOIN transcripts t ON t.id = s.transcript_id
      JOIN recordings r ON r.id = t.recording_id
      WHERE r.id = $1
        AND r.user_id = $2
        AND s.id = $3
        AND t.id = (
          SELECT current.id
          FROM transcripts current
          WHERE current.recording_id = r.id
          ORDER BY current.created_at DESC, current.id DESC
          LIMIT 1
        )
      LIMIT 1
    `, [req.params.id, req.user!.id, req.params.segmentId]);
    if (!rows.length) {
      res.status(404).json({ error: 'Current transcript segment not found.' });
      return;
    }
    const segment = rows[0];
    if (segment.language !== 'en-US') {
      res.status(409).json({ error: 'Pronunciation assessment is available only for English transcripts.' });
      return;
    }
    const expectedDurationMs = Number(segment.end_ms) - Number(segment.start_ms);
    if (expectedDurationMs <= 0 || expectedDurationMs > 30_000) {
      res.status(409).json({ error: 'This transcript segment is too long for pronunciation assessment.' });
      return;
    }
    const recordingDurationMs = Number(segment.duration_ms);
    const coversWholeRecording = Number(segment.start_ms) <= 250
      && Number.isFinite(recordingDurationMs)
      && recordingDurationMs > 0
      && Number(segment.end_ms) >= recordingDurationMs - 500;
    if (coversWholeRecording) {
      res.status(409).json({ error: 'Pronunciation assessment requires a clip shorter than the complete recording.' });
      return;
    }
    const wav = inspectPronunciationWav(req.file.buffer);
    const durationToleranceMs = Math.max(750, expectedDurationMs * 0.12);
    if (Math.abs(wav.durationMs - expectedDurationMs) > durationToleranceMs) {
      res.status(400).json({ error: 'The uploaded clip duration does not match this transcript segment.' });
      return;
    }
    const assessment = await assessEnglishPronunciation({
      audio: req.file.buffer,
      referenceText: segment.text,
    });
    const client = await db.pool.connect();
    let saved: any[] = [];
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        INSERT INTO pronunciation_assessments (
          segment_id, provider, locale, reference_text, audio_sha256, json_data
        )
        VALUES ($1, 'azure', 'en-US', $2, $3, $4)
        RETURNING id, created_at
      `, [segment.id, segment.text, pronunciationAudioHash(req.file.buffer), assessment]);
      saved = result.rows;
      await client.query(`
        INSERT INTO usage_logs (user_id, resource_type, provider, quantity, estimated_cost_usd)
        VALUES ($1, 'pronunciation_assessment', 'azure', $2, 0)
      `, [req.user!.id, wav.durationMs / 1000]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.status(201).json({
      id: saved[0].id,
      ...assessment,
      createdAt: saved[0].created_at
    });
  } catch (error: any) {
    console.error('Error assessing pronunciation:', error);
    const isInputError = error instanceof RangeError;
    res.status(isInputError ? 400 : 502).json({ error: error.message || 'Pronunciation assessment failed.' });
  }
};

export const analyzeRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { rows: tRows } = await db.query(`
      SELECT t.id, t.language, t.markdown
      FROM transcripts t
      JOIN recordings r ON r.id = t.recording_id
      WHERE t.recording_id = $1 AND r.user_id = $2
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT 1
    `, [id, userId]);
    if (tRows.length === 0) {
      res.status(404).json({ error: 'Transcript not found for this recording' });
      return;
    }
    
    const transcript = tRows[0];
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const model = configuredAnalysisModel();

    const modes = normalizeAnalysisModes(req.body?.modes);
    let outputLanguage;
    try {
      outputLanguage = normalizeAnalysisOutputLanguage(req.body?.outputLanguage);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }
    const context = typeof req.body?.context === 'string' ? req.body.context : '';
    const selectedSpeakers = normalizeSelectedSpeakers(req.body?.selectedSpeakers, transcript.markdown);
    if (Array.isArray(req.body?.selectedSpeakers) && selectedSpeakers.length === 0) {
      res.status(400).json({ error: 'Select at least one speaker found in the transcript.' });
      return;
    }
    let pronunciationEvidence: any[] = [];
    if (modes.includes('language') && transcript.language === 'en-US') {
      const { rows } = await db.query(`
        SELECT DISTINCT ON (s.id)
          pa.id AS assessment_id,
          s.id AS segment_id,
          s.speaker,
          s.text,
          s.start_ms,
          s.end_ms,
          pa.json_data
        FROM transcript_segments s
        JOIN pronunciation_assessments pa ON pa.segment_id = s.id
        WHERE s.transcript_id = $1
        ORDER BY s.id, pa.created_at DESC, pa.id DESC
      `, [transcript.id]);
      const selected = new Set(selectedSpeakers.map((speaker) => speaker.toLocaleLowerCase()));
      pronunciationEvidence = rows
        .filter((row: any) => !selected.size || selected.has(String(row.speaker).toLocaleLowerCase()))
        .map((row: any) => ({
          assessmentId: row.assessment_id,
          segmentId: row.segment_id,
          speaker: row.speaker,
          text: row.text,
          startMs: row.start_ms,
          endMs: row.end_ms,
          overallScore: row.json_data?.overallScore ?? null,
          accuracyScore: row.json_data?.accuracyScore ?? null,
          fluencyScore: row.json_data?.fluencyScore ?? null,
          completenessScore: row.json_data?.completenessScore ?? null,
          prosodyScore: row.json_data?.prosodyScore ?? null,
          possibleFillers: row.json_data?.possibleFillers ?? { totalCount: 0, matches: [] },
          weakWords: Array.isArray(row.json_data?.words)
            ? row.json_data.words
              .filter((word: any) => word?.errorType !== 'None' || (typeof word?.accuracyScore === 'number' && word.accuracyScore < 80))
              .slice(0, 12)
              .map((word: any) => ({ word: word.word, accuracyScore: word.accuracyScore, errorType: word.errorType }))
            : []
        }));
    }
    const analysisResult = await analyzeTranscriptWithOpenRouter(apiKey, transcript.markdown, model, {
      modes,
      outputLanguage,
      context,
      selectedSpeakers: selectedSpeakers.length ? selectedSpeakers : undefined,
      pronunciationEvidence
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
