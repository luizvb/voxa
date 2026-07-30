import type { TranscriptSegment } from '../platform/types';

type GrammarCorrection = {
  original?: unknown;
  speaker?: unknown;
  evidence?: unknown;
};

function normalizeMatchText(value: unknown) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function evidenceEntries(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [{ quote: item, speaker: '' }];
    if (!item || typeof item !== 'object') return [];
    const entry = item as { quote?: unknown; speaker?: unknown };
    return [{ quote: entry.quote, speaker: entry.speaker }];
  });
}

function phraseMatchQuality(segmentText: string, phrase: string) {
  if (!segmentText || !phrase) return 0;
  if (segmentText === phrase) return 3;

  const phraseWords = phrase.split(' ');
  if (phraseWords.length >= 2 && ` ${segmentText} `.includes(` ${phrase} `)) return 2;

  const segmentWords = segmentText.split(' ');
  if (segmentWords.length >= 3 && ` ${phrase} `.includes(` ${segmentText} `)) return 1;
  return 0;
}

export function findTranscriptSegmentForCorrection(
  segments: TranscriptSegment[] | undefined,
  correction: GrammarCorrection,
) {
  if (!segments?.length) return undefined;

  const evidence = evidenceEntries(correction.evidence);
  const phrases = [
    { text: normalizeMatchText(correction.original), priority: 2 },
    ...evidence.map((item) => ({ text: normalizeMatchText(item.quote), priority: 1 })),
  ].filter((item, index, items) => item.text && items.findIndex((candidate) => candidate.text === item.text) === index);
  if (!phrases.length) return undefined;

  const speakers = [correction.speaker, ...evidence.map((item) => item.speaker)]
    .map(normalizeMatchText)
    .filter(Boolean);
  const candidates = segments.flatMap((segment) => {
    const segmentText = normalizeMatchText(segment.text);
    const speakerMatches = speakers.includes(normalizeMatchText(segment.speaker));
    const phraseScore = phrases.reduce((best, phrase) => {
      const quality = phraseMatchQuality(segmentText, phrase.text);
      return Math.max(best, quality ? (quality * 100) + phrase.priority : 0);
    }, 0);
    if (!phraseScore) return [];
    return [{ segment, score: phraseScore + (speakerMatches ? 10 : 0), speakerMatches }];
  }).sort((left, right) => right.score - left.score);

  if (!candidates.length) return undefined;
  const speakerCandidates = candidates.filter((candidate) => candidate.speakerMatches);
  const ranked = speakerCandidates.length ? speakerCandidates : candidates;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) return undefined;
  return ranked[0].segment;
}
