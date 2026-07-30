CREATE TEMP TABLE legacy_english_transcripts ON COMMIT DROP AS
SELECT t.id, t.markdown, r.duration_ms
FROM transcripts t
JOIN recordings r ON r.id = t.recording_id
WHERE t.language IS NULL;

UPDATE transcripts t
SET language = 'en-US'
FROM legacy_english_transcripts legacy
WHERE t.id = legacy.id;

DO $$
DECLARE
  transcript_record RECORD;
  line TEXT;
  header_match TEXT[];
  timestamp_parts TEXT[];
  timestamp_part TEXT;
  timestamp_seconds NUMERIC;
  timestamp_valid BOOLEAN;
  next_start_ms INT;
  current_speaker TEXT;
  current_text TEXT;
  current_start_ms INT;
  current_position INT;
BEGIN
  FOR transcript_record IN
    SELECT legacy.id, legacy.markdown, legacy.duration_ms
    FROM legacy_english_transcripts legacy
    WHERE legacy.duration_ms > 0
      AND NOT EXISTS (
        SELECT 1
        FROM transcript_segments segment
        WHERE segment.transcript_id = legacy.id
      )
  LOOP
    current_speaker := NULL;
    current_text := '';
    current_start_ms := NULL;
    current_position := 0;

    FOREACH line IN ARRAY regexp_split_to_array(COALESCE(transcript_record.markdown, ''), E'\\r?\\n')
    LOOP
      header_match := regexp_match(
        line,
        '^\*\*([^*\n]+)\*\*\s*\(([^)\n]+)\)\s*$'
      );

      IF header_match IS NOT NULL THEN
        timestamp_parts := string_to_array(btrim(header_match[2]), ':');
        timestamp_seconds := 0;
        timestamp_valid := cardinality(timestamp_parts) BETWEEN 2 AND 3;

        IF timestamp_valid THEN
          FOREACH timestamp_part IN ARRAY timestamp_parts
          LOOP
            IF btrim(timestamp_part) !~ '^[0-9]+(\.[0-9]+)?$' THEN
              timestamp_valid := FALSE;
              EXIT;
            END IF;
            timestamp_seconds := (timestamp_seconds * 60) + btrim(timestamp_part)::NUMERIC;
          END LOOP;
        END IF;

        IF timestamp_valid THEN
          next_start_ms := ROUND(timestamp_seconds * 1000)::INT;
          IF current_speaker IS NOT NULL
            AND next_start_ms > current_start_ms
            AND btrim(current_text) <> ''
          THEN
            INSERT INTO transcript_segments (
              transcript_id, position, speaker, text, start_ms, end_ms
            )
            VALUES (
              transcript_record.id,
              current_position,
              current_speaker,
              btrim(current_text),
              current_start_ms,
              next_start_ms
            )
            ON CONFLICT (transcript_id, position) DO NOTHING;
            current_position := current_position + 1;
          END IF;

          current_speaker := btrim(header_match[1]);
          current_text := '';
          current_start_ms := next_start_ms;
        END IF;
      ELSIF current_speaker IS NOT NULL AND btrim(line) <> '' THEN
        current_text := CASE
          WHEN current_text = '' THEN btrim(line)
          ELSE current_text || E'\n' || btrim(line)
        END;
      END IF;
    END LOOP;

    IF current_speaker IS NOT NULL
      AND transcript_record.duration_ms > current_start_ms
      AND btrim(current_text) <> ''
    THEN
      INSERT INTO transcript_segments (
        transcript_id, position, speaker, text, start_ms, end_ms
      )
      VALUES (
        transcript_record.id,
        current_position,
        current_speaker,
        btrim(current_text),
        current_start_ms,
        transcript_record.duration_ms
      )
      ON CONFLICT (transcript_id, position) DO NOTHING;
    END IF;
  END LOOP;
END $$;
