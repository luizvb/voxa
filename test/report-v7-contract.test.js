const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('v7 report is a progressive briefing with three destinations and closed details', () => {
  const component = read('src/components/AIAnalysis.tsx');
  assert.match(component, /normalizeAnalysisReport\(analysis\)/);
  assert.match(component, /reportId}-summary/);
  assert.match(component, /reportId}-details/);
  assert.match(component, /reportId}-quality/);
  assert.doesNotMatch(component, /next-steps-section/);
  assert.doesNotMatch(component, /open=\{index === 0\}/);
  assert.doesNotMatch(component, /focusReportTarget\(`citation-/);
  assert.match(component, /<details className="evidence-disclosure">/);
  assert.match(component, /\[\{citationId\}\]/);
});

test('v7 read normalizer preserves legacy findings and summary fallbacks without migration', () => {
  const normalizer = read('src/lib/analysis-report.ts');
  assert.match(normalizer, /summary\.criticalFindings/);
  assert.match(normalizer, /summary\.keyPoints/);
  assert.match(normalizer, /legacySummary\.bottomLine \|\| legacySummary\.executiveBrief \|\| legacySummary\.overview/);
});

test('report labels use key findings in all supported languages', () => {
  const locales = read('src/i18n/locales.ts');
  assert.match(locales, /keyFindings: 'Key findings'/);
  assert.match(locales, /keyFindings: 'Principais conclusões'/);
  assert.match(locales, /keyFindings: 'Conclusiones principales'/);
  assert.doesNotMatch(locales, /Achados críticos|Critical findings|Hallazgos críticos/);
});

test('language report uses role-neutral labels and omits educational context metadata', () => {
  const component = read('src/components/AIAnalysis.tsx');
  const languageReport = component.slice(component.indexOf('function LanguageReport'), component.indexOf('function MeetingReport'));
  const locales = read('src/i18n/locales.ts');
  const browserPdf = read('src/lib/browser-pdf.ts');

  assert.doesNotMatch(languageReport, /<ContextStrip/);
  assert.match(locales, /learnerAssessment: 'Speaker assessment'/);
  assert.match(locales, /learnerAssessment: 'Avaliação do speaker'/);
  assert.match(locales, /learnerAssessment: 'Evaluación del hablante'/);
  assert.match(locales, /lessonProgress: 'Observed progress'/);
  assert.match(locales, /lessonProgress: 'Progresso encontrado'/);
  assert.match(locales, /lessonProgress: 'Progreso observado'/);
  assert.match(locales, /nextLessonPlan: 'Suggested improvement plan'/);
  assert.match(locales, /nextLessonPlan: 'Plano sugerido de melhoria'/);
  assert.match(locales, /nextLessonPlan: 'Plan de mejora sugerido'/);
  assert.doesNotMatch(browserPdf, /renderNode\('recommendedActions'/);
  assert.doesNotMatch(browserPdf, /renderNode\('unansweredQuestions'/);
  assert.match(browserPdf, /\['learnerAssessment', \['learnerProfiles'\]\]/);
});

test('report controls retain focus and reduced-motion treatment at compact widths', () => {
  const css = read('src/index.css');
  assert.match(css, /\.analysis-view :where\(button, summary, \[tabindex="0"\]\):focus-visible/);
  assert.match(css, /\.analysis-section-nav \{ grid-template-columns: repeat\(3/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css.slice(css.indexOf('Progressive briefing layout')), /min-height: 360px/);
});
