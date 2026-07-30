const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const controller = readFileSync('backend/src/controllers/recordings.ts', 'utf8');
const routes = readFileSync('backend/src/routes/recordings.ts', 'utf8');
const platformTypes = readFileSync('src/platform/types.ts', 'utf8');
const historyView = readFileSync('src/components/HistoryView.tsx', 'utf8');

test('each generated analysis is appended and saved analyses remain owner-scoped', () => {
  assert.match(controller, /INSERT INTO analyses \(recording_id, json_data\)/);
  assert.doesNotMatch(controller, /DELETE FROM analyses/);
  assert.match(controller, /export const listAnalyses/);
  assert.match(controller, /ORDER BY a\.created_at DESC, a\.id DESC/);
  assert.match(controller, /a\.recording_id = \$1 AND r\.user_id = \$2/);
  assert.match(controller, /a\.recording_id = \$1 AND a\.id = \$2 AND r\.user_id = \$3/);
});

test('analysis history is available across API, web, Electron and the conversation UI', () => {
  assert.match(routes, /get\('\/:id\/analyses', listAnalyses\)/);
  assert.match(routes, /get\('\/:id\/analyses\/:analysisId', getAnalysisById\)/);
  assert.match(platformTypes, /listAnalyses\(recordingId: string\): Promise<AnalysisSummary\[\]>/);
  assert.match(platformTypes, /getAnalysis\(recordingId: string, analysisId\?: string\)/);
  assert.match(historyView, /platform\.listAnalyses\(selected\.id\)/);
  assert.match(historyView, /className="analysis-history-field"/);
  assert.match(historyView, /handleAnalysisSelection/);
  assert.match(historyView, /latestAnalysis/);
});
