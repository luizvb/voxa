const assert = require('node:assert/strict');
const test = require('node:test');

const segments = [
  { id: 'segment-1', position: 0, speaker: 'Learner', text: 'Yesterday, I go to the office.', startMs: 1000, endMs: 4200 },
  { id: 'segment-2', position: 1, speaker: 'Teacher', text: 'Yesterday I went to the office.', startMs: 4300, endMs: 7200 },
  { id: 'segment-3', position: 2, speaker: 'Learner', text: 'I work here since two years.', startMs: 7300, endMs: 10100 },
];

test('matches a correction to the same-speaker segment despite punctuation and case', async () => {
  const { findTranscriptSegmentForCorrection } = await import('../src/lib/transcript-segment-match.ts');
  const match = findTranscriptSegmentForCorrection(segments, {
    speaker: 'LEARNER',
    original: 'yesterday i go to the office',
  });

  assert.equal(match?.id, 'segment-1');
});

test('uses an evidence quote when the original correction is not a full transcript phrase', async () => {
  const { findTranscriptSegmentForCorrection } = await import('../src/lib/transcript-segment-match.ts');
  const match = findTranscriptSegmentForCorrection(segments, {
    speaker: 'Learner',
    original: 'not present in the transcript',
    evidence: [{ speaker: 'Learner', quote: 'I work here since two years.' }],
  });

  assert.equal(match?.id, 'segment-3');
});

test('does not attach a generic single word or an ambiguous phrase to arbitrary audio', async () => {
  const { findTranscriptSegmentForCorrection } = await import('../src/lib/transcript-segment-match.ts');
  assert.equal(findTranscriptSegmentForCorrection(segments, { original: 'I' }), undefined);

  const duplicateSegments = [
    ...segments,
    { id: 'segment-4', position: 3, speaker: 'Learner', text: 'Yesterday, I go to the office.', startMs: 10200, endMs: 13000 },
  ];
  assert.equal(findTranscriptSegmentForCorrection(duplicateSegments, {
    speaker: 'Learner',
    original: 'Yesterday I go to the office',
  }), undefined);
});
