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
