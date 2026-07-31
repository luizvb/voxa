import type { PronunciationAssessment, TranscriptSegment } from '../platform';

export type PronunciationWord = PronunciationAssessment['words'][number];
export type PronunciationWordLevel = 'is-poor' | 'is-needs-work' | '';

export function getPronunciationWordLevel(word: PronunciationWord): PronunciationWordLevel {
  const score = word.accuracyScore;
  const severeError = ['Mispronunciation', 'Omission'].includes(word.errorType);
  if (severeError || (score !== null && score < 60)) return 'is-poor';
  if (word.errorType !== 'None' || (score !== null && score < 80)) return 'is-needs-work';
  return '';
}

export function getPronunciationWordPlaybackBounds(
  segment: Pick<TranscriptSegment, 'startMs' | 'endMs'>,
  word: PronunciationWord,
  contextMs = 100,
): { startSeconds: number; endSeconds: number } | null {
  if (
    word.errorType === 'Omission'
    || typeof word.offsetMs !== 'number'
    || !Number.isFinite(word.offsetMs)
    || word.offsetMs < 0
    || typeof word.durationMs !== 'number'
    || !Number.isFinite(word.durationMs)
    || word.durationMs <= 0
  ) {
    return null;
  }

  const segmentStartMs = Math.max(0, segment.startMs);
  const segmentEndMs = Math.max(segmentStartMs, segment.endMs);
  const startMs = Math.max(segmentStartMs, segmentStartMs + word.offsetMs - contextMs);
  const endMs = Math.min(segmentEndMs, segmentStartMs + word.offsetMs + word.durationMs + contextMs);
  if (endMs <= startMs) return null;
  return { startSeconds: startMs / 1000, endSeconds: endMs / 1000 };
}
