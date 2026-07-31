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

test('PDF report normalizes and exports structured legacy insight fields', () => {
  const html = buildAnalysisReportHtml({
    recording: { name: 'Structured review' },
    analysis: {
      version: '5.0',
      analysisModes: ['interview', 'language', 'meeting'],
      evidenceQuality: { level: 'high', limitations: [], missingInformation: ['Revenue baseline was not stated.'] },
      summary: {
        title: 'Review',
        purpose: { statement: 'Assess the conversation.' },
        executiveBrief: { statement: 'A grounded executive brief.' },
        bottomLine: { statement: 'Execution is credible, but the commercial case remains incomplete.', evidence: [] },
        criticalFindings: [{ finding: 'The rollout has an accountable owner.', significance: 'Execution risk is lower.', businessImpact: 'Faster delivery.', evidence: [] }],
        recommendedActions: [{ action: 'Validate the revenue baseline.', rationale: 'The decision lacks an economic anchor.', expectedOutcome: 'A defensible investment decision.', evidence: [] }],
        unansweredQuestions: [{ question: 'What is the baseline revenue?', whyItMatters: 'It constrains ROI.', evidence: [] }],
        keyPoints: [{ statement: 'A grounded key point.' }]
      },
      interview: { executiveAssessment: { overallScore: 7, evidenceSignal: 'mixed', decisionReadiness: 'partial', keyTradeoff: 'Strong ownership, limited commercial evidence.', rationale: 'Needs more evidence.' }, strengths: [{ signal: 'Clear ownership', demonstratedBy: 'Named the contribution.', hiringRelevance: 'Execution signal.', evidence: [] }], concerns: [], competencies: [], questionReviews: [], coaching: { priorities: [], candidateQuestions: [], practiceQuestions: [] } },
      languageClass: { lessonContext: { objective: 'Practice updates.', executiveBrief: 'The learner communicates decisions clearly.', learnerSpeakers: ['Alex'] }, learnerProfiles: [{ speaker: 'Alex', cefr: { level: 'B2' }, skills: { grammar: { score: 7 } }, strengths: [], priorities: [], highestLeverageChange: 'Use explicit business outcomes.' }], corrections: [], lessonProgress: {}, teacherPlan: {} },
      meeting: { executiveBrief: { bottomLine: 'Proceed with a staged rollout.', outcome: 'A staged plan was selected.', whatChanged: [], needsDecision: [], needsEscalation: [], managementAttention: ['Confirm the revenue baseline.'] }, decisions: [], actionItems: [], proposals: [], risks: [], blockers: [], metrics: [], openQuestions: [], tensions: [{ topic: 'Speed versus evidence', positions: ['Launch now', 'Validate economics first'], implication: 'The schedule may move.', resolutionNeeded: 'Agree on a validation gate.', evidence: [] }], strategicImplications: [{ implication: 'The operating model becomes reusable.', whyItMatters: 'It lowers future launch cost.', timeHorizon: 'near_term', evidence: [] }], topics: [] }
    }
  });
  assert.doesNotMatch(html, /A grounded executive brief/);
  assert.match(html, /Execution is credible/);
  assert.match(html, /The rollout has an accountable owner/);
  assert.match(html, /Validate the revenue baseline/);
  assert.match(html, /What is the baseline revenue/);
  assert.match(html, /Revenue baseline was not stated/);
  assert.match(html, /Assess the conversation/);
  assert.doesNotMatch(html, /A grounded key point/);
  assert.match(html, /Clear ownership/);
  assert.match(html, /Strong ownership, limited commercial evidence/);
  assert.match(html, /Decision readiness/);
  assert.match(html, /partial/);
  assert.match(html, /Practice updates/);
  assert.match(html, /The learner communicates decisions clearly/);
  assert.match(html, /Use explicit business outcomes/);
  assert.match(html, /B2/);
  assert.match(html, /A staged plan was selected/);
  assert.match(html, /Confirm the revenue baseline/);
  assert.match(html, /Speed versus evidence/);
  assert.match(html, /The operating model becomes reusable/);
});

test('PDF report prints reused evidence as references and the quote once in the catalog', () => {
  const quote = 'I led the staged rollout with three teams';
  const reference = { citationId: 'E001', turnId: 'T002', speaker: 'Candidate', quote };
  const html = buildAnalysisReportHtml({
    locale: 'pt-BR',
    recording: { name: 'Entrevista' },
    analysis: {
      version: '7.0',
      analysisModes: ['interview'],
      summary: {
        title: 'Entrevista',
        bottomLine: { statement: 'Há evidência de liderança.', evidence: [reference] },
        keyFindings: [{ finding: 'Liderança', significance: 'Relevante.', businessImpact: 'Execução.', evidence: [reference] }]
      },
      evidenceQuality: {
        level: 'high',
        evidenceCatalog: [reference],
        transcriptionUncertainties: []
      },
      interview: {
        executiveAssessment: { overallScore: 8, evidenceSignal: 'strong', rationale: 'Evidência específica.', evidence: [reference] },
        strengths: [], concerns: [], competencies: [], questionReviews: [], coaching: { priorities: [], candidateQuestions: [], practiceQuestions: [] }
      }
    }
  });
  assert.equal(html.split(quote).length - 1, 1);
  assert.ok((html.match(/E001/g) || []).length >= 4);
  assert.match(html, /Apêndice de evidências/);
  assert.match(html, /\[E001\]/);
});

test('PDF report preserves v6 summary content through the read normalizer', () => {
  const html = buildAnalysisReportHtml({
    locale: 'en-US',
    recording: { name: 'Legacy report' },
    analysis: {
      version: '6.0',
      analysisModes: [],
      summary: {
        title: 'Legacy report',
        executiveBrief: { statement: 'Legacy decision summary.' },
        keyPoints: [{ statement: 'Legacy grounded point.' }]
      },
      evidenceQuality: {}
    }
  });
  assert.match(html, /Legacy decision summary/);
  assert.match(html, /Legacy grounded point/);
  assert.match(html, /Key findings/);
});
