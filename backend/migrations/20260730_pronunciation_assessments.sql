ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS language VARCHAR(20);

DROP INDEX IF EXISTS transcripts_recording_provider_idx;
CREATE INDEX IF NOT EXISTS transcripts_recording_created_idx
  ON transcripts(recording_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  position INT NOT NULL,
  speaker VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  start_ms INT NOT NULL CHECK (start_ms >= 0),
  end_ms INT NOT NULL CHECK (end_ms > start_ms),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transcript_id, position)
);

CREATE INDEX IF NOT EXISTS transcript_segments_transcript_position_idx
  ON transcript_segments(transcript_id, position);

CREATE TABLE IF NOT EXISTS pronunciation_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  locale VARCHAR(20) NOT NULL,
  reference_text TEXT NOT NULL,
  audio_sha256 VARCHAR(64) NOT NULL,
  json_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pronunciation_assessments_segment_created_idx
  ON pronunciation_assessments(segment_id, created_at DESC, id DESC);
