const assert = require('node:assert/strict');
const test = require('node:test');

const { buildAnalysisReportHtml, escapeHtml } = require('../app/report-export');

test('PDF report HTML includes every selected analysis mode', () => {
  const html = buildAnalysisReportHtml({
    locale: 'en-US',
    recording: { name: 'Leadership interview', createdAt: '2026-07-10T12:00:00.000Z' },
    analysis: {
      analysisModes: ['interview', 'language', 'meeting'],
      summary: { overview: 'A useful conversation.' },
      executiveSignals: { keyTakeaways: ['Clear ownership'] },
      evidenceQuality: { level: 'medium' },
      speakers: [{ id: 'Speaker 0', language: { cefrEstimate: 'B2', feedback: 'Clear.' } }],
      interview: { overallScore: 8, outcomeForecast: { label: 'likely_advance', rationale: 'Specific evidence.' }, competencies: [], questions: [] },
      languageClass: { overallCefr: 'B2', overallScore: 8, corrections: [], studyPlan: [] },
      meeting: { executiveSummary: 'Decision made.', decisions: [], actionItems: [] }
    }
  });

  assert.match(html, /Interview analysis/);
  assert.match(html, /Language lesson analysis/);
  assert.match(html, /Meeting analysis/);
  assert.match(html, /Leadership interview/);
  assert.match(html, /@page\s*\{[\s\S]*size:\s*A4/);
  assert.match(html, /data-layout="editorial-minimal"/);
  assert.match(html, /data-report-version="analysis-aligned"/);
  assert.match(html, /content: counter\(page\)/);
  assert.doesNotMatch(html, /min-height:\s*250mm/);
  assert.doesNotMatch(html, /border-radius:\s*999/);
  assert.doesNotMatch(html, /background:\s*#f2f6f1/);
});

test('report export escapes user and model-provided HTML', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  const html = buildAnalysisReportHtml({ recording: { name: '<img src=x>' }, analysis: { summary: {} } });
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /&lt;img src=x&gt;/);
});

test('PDF report reads the structured v4 insight fields', () => {
  const html = buildAnalysisReportHtml({
    recording: { name: 'Structured review' },
    analysis: {
      version: '4.0', analysisModes: ['interview', 'language', 'meeting'], evidenceQuality: { level: 'high' },
      summary: { title: 'Review', purpose: { statement: 'Assess the conversation.' }, executiveBrief: { statement: 'A grounded executive brief.' }, keyPoints: [{ statement: 'A grounded key point.' }] },
      interview: { executiveAssessment: { overallScore: 7, outcomeForecast: 'uncertain', rationale: 'Needs more evidence.' }, strengths: [{ signal: 'Clear ownership', demonstratedBy: 'Named the contribution.', hiringRelevance: 'Execution signal.', evidence: [] }], concerns: [], competencies: [], questionReviews: [], coaching: { priorities: [], candidateQuestions: [], practiceQuestions: [] } },
      languageClass: { lessonContext: { objective: 'Practice updates.', learnerSpeakers: ['Alex'] }, learnerProfiles: [{ speaker: 'Alex', cefr: { level: 'B2' }, skills: { grammar: { score: 7 } }, strengths: [], priorities: [] }], corrections: [], lessonProgress: {}, teacherPlan: {} },
      meeting: { executiveBrief: { outcome: 'A staged plan was selected.', whatChanged: [], needsDecision: [], needsEscalation: [] }, decisions: [], actionItems: [], proposals: [], risks: [], blockers: [], metrics: [], openQuestions: [], topics: [] }
    }
  });
  assert.match(html, /A grounded executive brief/);
  assert.match(html, /Assess the conversation/);
  assert.match(html, /A grounded key point/);
  assert.match(html, /Clear ownership/);
  assert.match(html, /Practice updates/);
  assert.match(html, /B2/);
  assert.match(html, /A staged plan was selected/);
});
