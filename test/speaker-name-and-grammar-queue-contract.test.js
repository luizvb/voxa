const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const controller = readFileSync('backend/src/controllers/recordings.ts', 'utf8');
const routes = readFileSync('backend/src/routes/recordings.ts', 'utf8');
const platformTypes = readFileSync('src/platform/types.ts', 'utf8');
const webPlatform = readFileSync('src/platform/web-platform.ts', 'utf8');
const electronMain = readFileSync('app/main.js', 'utf8');
const historyView = readFileSync('src/components/HistoryView.tsx', 'utf8');
const analysisView = readFileSync('src/components/AIAnalysis.tsx', 'utf8');

test('participant names persist owner-scoped in the current transcript across web and Electron', () => {
  assert.match(routes, /patch\('\/:id\/transcript\/speakers', renameTranscriptSpeakers\)/);
  assert.match(controller, /r\.user_id = \$2/);
  assert.match(controller, /FOR UPDATE OF t/);
  assert.match(controller, /UPDATE transcripts SET markdown/);
  assert.match(controller, /UPDATE transcript_segments SET speaker = CASE/);
  assert.match(platformTypes, /renameTranscriptSpeakers\(input: RenameTranscriptSpeakersInput\)/);
  assert.match(webPlatform, /method: 'PATCH'/);
  assert.match(electronMain, /transcriptions:rename-speakers/);
});

test('pending participant names are saved before insights and grammar audio runs as one participant queue', () => {
  assert.match(historyView, /speakerNamesDirty \? await saveSpeakerNames\(\) : selectedSpeakers/);
  assert.match(historyView, /saveSpeakerNames\(\)\.catch\(\(\) => undefined\)/);
  assert.match(historyView, /setSpeakerNameStatus\(t\('history', 'speakerNamesSaved'\)\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*setSpeakerNamesExpanded\(false\)/);
  assert.match(historyView, /nameSpeakersBeforeInsights/);
  assert.match(historyView, /speaker-name-panel/);
  assert.match(historyView, /hasGenericSpeakerNames/);
  assert.match(analysisView, /language-participant-focus/);
  assert.match(analysisView, /scopeLanguageItems/);
  assert.match(analysisView, /queuedGrammarCorrections/);
  assert.match(analysisView, /playGrammarQueueItem\(index \+ 1\)/);
  assert.match(analysisView, /playAllGrammar/);
});
