const assert = require('node:assert/strict');
const test = require('node:test');

const { ANALYSIS_CONTRACT_VERSION, DEFAULT_ANALYSIS_MODEL, buildAnalysisJsonSchema, buildAnalysisOutputContract, buildAnalysisPrompt, buildTranscriptStructure, configuredAnalysisModel, extractSpeakerLabels, normalizeAnalysisModes, normalizeAnalysisOutputLanguage, normalizeSelectedSpeakers, parseTranscriptTurns, sanitizeAnalysisResult } = require('../dist/services/llm');
const { completeJsonWithOpenRouter } = require('../dist/services/llm');

test('analysis modes are validated, deduplicated and default to language', () => {
  assert.deepEqual(normalizeAnalysisModes(['meeting', 'interview', 'meeting', 'invalid']), ['meeting', 'interview']);
  assert.deepEqual(normalizeAnalysisModes([]), ['language']);
  assert.deepEqual(normalizeAnalysisModes('meeting'), ['language']);
});

test('frontier analysis model is the default while explicit configuration still wins', () => {
  assert.equal(DEFAULT_ANALYSIS_MODEL, 'openai/gpt-5.6-sol-pro');
  assert.equal(configuredAnalysisModel({}), 'openai/gpt-5.6-sol-pro');
  assert.equal(configuredAnalysisModel({ OPENROUTER_MODEL: 'google/gemini-3.1-flash-lite' }), 'openai/gpt-5.6-sol-pro');
  assert.equal(configuredAnalysisModel({ OPENROUTER_MODEL: 'legacy/model' }), 'legacy/model');
  assert.equal(configuredAnalysisModel({ VOXA_ANALYSIS_MODEL: 'preferred/model', OPENROUTER_MODEL: 'legacy/model' }), 'preferred/model');
});

test('insight output language is limited to the three platform languages', () => {
  assert.equal(normalizeAnalysisOutputLanguage(undefined), 'pt-BR');
  assert.equal(normalizeAnalysisOutputLanguage('en-US'), 'en-US');
  assert.equal(normalizeAnalysisOutputLanguage('pt-BR'), 'pt-BR');
  assert.equal(normalizeAnalysisOutputLanguage('es-ES'), 'es-ES');
  assert.throws(() => normalizeAnalysisOutputLanguage('pt'), /Unsupported insight language/);
});

test('analysis prompt keeps narrative in the platform language and evidence verbatim', () => {
  for (const [locale, name] of [['en-US', 'English'], ['pt-BR', 'Brazilian Portuguese'], ['es-ES', 'Spanish']]) {
    const prompt = buildAnalysisPrompt('Ana: Vamos começar.', { modes: ['meeting'], outputLanguage: locale });
    assert.match(prompt, new RegExp(`every human-readable analysis value in ${name}`));
    assert.match(prompt, /Evidence\.quote and correction\.original are the only language exceptions/);
    assert.match(prompt, new RegExp(`summary\\.language to exactly "${locale}"`));
  }
});

test('saved pronunciation evidence is available only to the language lens', () => {
  const pronunciationEvidence = [{
    assessmentId: 'assessment-1',
    segmentId: 'segment-1',
    speaker: 'Speaker 0',
    text: 'Hello world.',
    startMs: 100,
    endMs: 1200,
    overallScore: 74,
    accuracyScore: 68,
    fluencyScore: 82,
    completenessScore: 100,
    prosodyScore: 71,
    weakWords: [{ word: 'world', accuracyScore: 55, errorType: 'Mispronunciation' }],
  }];
  const languagePrompt = buildAnalysisPrompt('**Speaker 0** (00:00)\nHello world.', {
    modes: ['language'],
    pronunciationEvidence,
  });
  assert.match(languagePrompt, /TRUSTED PRONUNCIATION ASSESSMENTS/);
  assert.match(languagePrompt, /assessment-1/);
  assert.match(languagePrompt, /Mispronunciation/);
  assert.match(languagePrompt, /map provider scores from 0-100 to the 0-10 intelligibility score/);

  const meetingPrompt = buildAnalysisPrompt('**Speaker 0** (00:00)\nHello world.', {
    modes: ['meeting'],
    pronunciationEvidence,
  });
  assert.doesNotMatch(meetingPrompt, /assessment-1/);
});

test('speaker labels are extracted from Deepgram markdown and common pasted transcript formats', () => {
  const transcript = [
    '**Speaker 0** (00:01)',
    'Hello there.',
    '',
    '**Speaker 1** (00:03)',
    'Hi.',
    'Ana: Vamos começar.',
    '[Bruno]: Claro.',
    '**Carla:** I can take that.',
    '[00:01] Diego: Let us begin.',
    'Decision: Move forward with the launch.',
    '**Topic:** Launch readiness',
    'Summary: The team aligned.',
    '00:15: this timestamp is not a speaker',
    'ana: duplicate label with different case'
  ].join('\n');
  assert.deepEqual(extractSpeakerLabels(transcript), ['Speaker 0', 'Speaker 1', 'Ana', 'Bruno', 'Carla', 'Diego']);
  assert.deepEqual(normalizeSelectedSpeakers(['bruno', 'Speaker 0', 'missing'], transcript), ['Speaker 0', 'Bruno']);
});

test('multiline transcripts are assembled into complete turns and question-answer units', () => {
  const transcript = [
    '**Interviewer** (00:10)',
    'Tell me about the migration you led',
    'and which trade-off was hardest?',
    '',
    '**Candidate** (00:25)',
    'I split it into two stages.',
    'The hard trade-off was speed versus rollback safety.',
    '',
    '**Interviewer** (00:50)',
    'What changed after launch?',
    '**Candidate:** Failed imports fell by thirty percent.'
  ].join('\n');
  const turns = parseTranscriptTurns(transcript);
  assert.deepEqual(turns.map(({ id, speaker, text }) => ({ id, speaker, text })), [
    { id: 'T001', speaker: 'Interviewer', text: 'Tell me about the migration you led and which trade-off was hardest?' },
    { id: 'T002', speaker: 'Candidate', text: 'I split it into two stages. The hard trade-off was speed versus rollback safety.' },
    { id: 'T003', speaker: 'Interviewer', text: 'What changed after launch?' },
    { id: 'T004', speaker: 'Candidate', text: 'Failed imports fell by thirty percent.' }
  ]);
  const structured = buildTranscriptStructure(transcript);
  assert.deepEqual(structured.questionMap, ['Q001: T001 -> T002', 'Q002: T003 -> T004']);
  assert.match(structured.formatted, /T002 \[00:25\] Candidate: I split it into two stages/);
});

test('combined analysis prompt includes selected schemas and safety boundaries', () => {
  const prompt = buildAnalysisPrompt('**Speaker 0** Hello', {
    modes: ['interview', 'language', 'meeting'],
    outputLanguage: 'pt-BR',
    context: 'Principal Engineer role'
  });

  assert.match(prompt, /Selected modes: interview, language, meeting/);
  assert.match(prompt, /INTERVIEW LENS/);
  assert.match(prompt, /LANGUAGE LESSON LENS/);
  assert.match(prompt, /MEETING LENS/);
  assert.match(prompt, /strong\|mixed\|weak\|insufficient/);
  assert.match(prompt, /decisionReadiness/);
  assert.match(prompt, /learnerProfiles/);
  assert.match(prompt, /questionReviews/);
  assert.match(prompt, /executiveBrief/);
  assert.match(prompt, /contradictions/);
  assert.match(prompt, /languagePatterns/);
  assert.match(prompt, /participantViews/);
  assert.match(prompt, /STRUCTURE AND DEPTH RULES/);
  assert.match(prompt, /exact consecutive transcript quote/);
  assert.match(prompt, /Principal Engineer role/);
  assert.match(prompt, /\*\*Speaker 0\*\* Hello/);
});

test('v6 output contract adds a citation ledger and transcription uncertainty register', () => {
  const contract = buildAnalysisOutputContract(['interview', 'meeting']);
  assert.equal(ANALYSIS_CONTRACT_VERSION, '6.0');
  assert.deepEqual(Object.keys(contract), ['version', 'analysisModes', 'summary', 'evidenceQuality', 'interview', 'languageClass', 'meeting']);
  assert.equal(contract.languageClass, null);
  assert.ok(contract.interview.context);
  assert.ok(contract.interview.executiveAssessment);
  assert.ok(contract.summary.bottomLine);
  assert.ok(contract.summary.criticalFindings);
  assert.ok(contract.summary.recommendedActions);
  assert.ok(contract.evidenceQuality.citationSummary);
  assert.ok(contract.evidenceQuality.evidenceCatalog);
  assert.ok(contract.evidenceQuality.transcriptionUncertainties);
  assert.ok(contract.interview.coaching);
  assert.ok(contract.meeting.executiveBrief);
  assert.ok(contract.meeting.actionItems);
  assert.ok(contract.meeting.tensions);
  assert.ok(contract.meeting.strategicImplications);
  assert.ok(contract.meeting.nextMeeting);
});

test('analysis JSON schema is strict, mode-specific and constrains scores', () => {
  const schema = buildAnalysisJsonSchema(['meeting']);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ['version', 'analysisModes', 'summary', 'evidenceQuality', 'interview', 'languageClass', 'meeting']);
  assert.deepEqual(schema.properties.interview, { type: 'null' });
  assert.deepEqual(schema.properties.version.enum, ['6.0']);
  assert.deepEqual(schema.properties.analysisModes.items.enum, ['meeting']);
  assert.equal(schema.properties.analysisModes.minItems, 1);
  assert.equal(schema.properties.analysisModes.maxItems, 1);
  assert.equal(schema.properties.meeting.additionalProperties, false);
  assert.deepEqual(schema.properties.meeting.properties.risks.items.properties.severity.enum, ['critical', 'high', 'medium', 'low']);
  assert.equal(schema.properties.summary.properties.bottomLine.additionalProperties, false);
});

test('single analysis prompt excludes unselected instructions', () => {
  const prompt = buildAnalysisPrompt('Transcript', { modes: ['language'] });
  assert.match(prompt, /LANGUAGE LESSON LENS/);
  assert.doesNotMatch(prompt, /INTERVIEW LENS/);
  assert.doesNotMatch(prompt, /MEETING LENS/);
});

test('analysis prompt requests every selected speaker and sanitizer filters participant-specific output', () => {
  const transcript = 'Ana: I will lead this.\nBruno: I will review this.';
  const prompt = buildAnalysisPrompt(transcript, { modes: ['language'], selectedSpeakers: ['Ana', 'Bruno'] });
  assert.match(prompt, /Participant-specific insights requested for: Ana, Bruno/);
  assert.match(prompt, /do not silently analyze only the first participant/);

  const raw = buildAnalysisOutputContract(['language']);
  raw.languageClass.learnerProfiles = [
    { ...raw.languageClass.learnerProfiles[0], speaker: 'Ana' },
    { ...raw.languageClass.learnerProfiles[0], speaker: 'Bruno' }
  ];
  const sanitized = sanitizeAnalysisResult(raw, transcript, ['language'], ['Bruno']);
  assert.deepEqual(sanitized.languageClass.learnerProfiles.map((profile) => profile.speaker), ['Bruno']);
});

test('analysis sanitizer enforces mode isolation, score ranges and exact evidence', () => {
  const transcript = 'Ana: I will send the launch checklist on Friday. Bruno: Great, I will review it.';
  const sanitized = sanitizeAnalysisResult({
    version: '2.0',
    analysisModes: ['meeting', 'language'],
    summary: {
      title: 'Launch',
      purpose: { statement: 'Review the launch checklist.', evidence: [{ speaker: 'Ana', quote: 'I will send the launch checklist on Friday' }] },
      executiveBrief: { statement: 'Ana committed to send the checklist.', evidence: [{ speaker: 'Ana', quote: 'I will send the launch checklist on Friday' }] },
      keyPoints: [{ statement: 'Checklist delivery is scheduled.', category: 'fact', evidence: [{ speaker: 'Ana', quote: 'send the launch checklist on Friday' }] }]
    },
    evidenceQuality: { level: 'high', reasons: [], limitations: [] },
    languageClass: { overallScore: 12 },
    meeting: {
      actionItems: [
        { task: 'Send checklist', owner: 'Ana', dueDate: 'Friday', evidence: [{ speaker: 'Ana', quote: 'I will send the launch checklist on Friday' }] },
        { task: 'Invented task', owner: 'Bruno', dueDate: 'Monday', evidence: [{ speaker: 'Bruno', quote: 'Bruno owns this next Monday' }] }
      ],
      decisions: [{ decision: 'Ship today', score: 14, evidence: [{ speaker: 'Ana', quote: 'This was never said' }] }]
    },
    extra: true,
    unexpectedModeKey: true
  }, transcript, ['meeting']);

  assert.deepEqual(Object.keys(sanitized), ['version', 'analysisModes', 'summary', 'evidenceQuality', 'interview', 'languageClass', 'meeting']);
  assert.equal(sanitized.version, '6.0');
  assert.deepEqual(sanitized.analysisModes, ['meeting']);
  assert.equal(sanitized.interview, null);
  assert.equal(sanitized.languageClass, null);
  assert.equal(sanitized.meeting.actionItems.length, 1);
  assert.equal(sanitized.meeting.actionItems[0].owner, 'Ana');
  assert.equal(sanitized.meeting.actionItems[0].dueDate, 'Friday');
  assert.equal(sanitized.meeting.decisions.length, 0);
  assert.deepEqual(Object.keys(sanitized.meeting), Object.keys(buildAnalysisOutputContract(['meeting']).meeting));
  assert.equal(sanitized.evidenceQuality.level, 'low');
  assert.ok(sanitized.evidenceQuality.limitations.length >= 1);
});

test('sanitizer canonicalizes repeated quotes into one transparent citation catalog', () => {
  const transcript = 'Ana: I will send the launch checklist on Friday.';
  const quote = { speaker: 'Ana', quote: 'I will send the launch checklist on Friday' };
  const sanitized = sanitizeAnalysisResult({
    summary: {
      title: 'Launch',
      criticalFindings: [
        { finding: 'Checklist commitment', significance: 'Execution is explicit.', businessImpact: 'Reduces ambiguity.', confidence: 'high', evidence: [quote, quote] },
        { finding: 'Friday timing', significance: 'Timing is explicit.', businessImpact: 'Supports planning.', confidence: 'high', evidence: [quote] }
      ]
    },
    evidenceQuality: { level: 'high', reasons: [], limitations: [], missingInformation: [], transcriptionUncertainties: [] },
    meeting: {
      actionItems: [{ task: 'Send checklist', owner: 'Ana', dueDate: 'Friday', priority: 'high', status: 'open', dependency: null, expectedOutcome: 'Checklist sent.', evidence: [quote] }]
    }
  }, transcript, ['meeting']);

  assert.equal(sanitized.evidenceQuality.evidenceCatalog.length, 1);
  assert.deepEqual(sanitized.evidenceQuality.citationSummary, {
    totalReferences: 4,
    uniqueCitations: 1,
    repeatedReferences: 3,
    reuseRatio: 0.75
  });
  assert.equal(sanitized.summary.criticalFindings[0].evidence.length, 1);
  assert.equal(sanitized.summary.criticalFindings[0].evidence[0].citationId, 'E001');
  assert.equal(sanitized.summary.criticalFindings[0].evidence[0].turnId, 'T001');
  assert.equal(sanitized.meeting.actionItems[0].evidence[0].citationId, 'E001');
});

test('self-repairs and probable ASR corruption cannot become vocabulary failures', () => {
  const transcript = [
    'Candidate: I worked as full psych … full stack developer.',
    'Candidate: In React we used styles company for the design system.'
  ].join('\n');
  const sanitized = sanitizeAnalysisResult({
    summary: {},
    evidenceQuality: {
      level: 'medium',
      reasons: [],
      limitations: [],
      missingInformation: [],
      transcriptionUncertainties: [{
        turnId: '',
        original: 'styles company',
        probableReading: 'Styled Components',
        confidence: 'medium',
        rationale: 'React styling context supports a technical proper name.',
        affectsAssessment: true
      }]
    },
    languageClass: {
      languagePatterns: [
        { category: 'vocabulary', pattern: 'Incorrect job title', frequency: 'single', impact: 'Low precision.', evidence: [{ speaker: 'Candidate', quote: 'full psych … full stack developer' }] },
        { category: 'vocabulary', pattern: 'Incorrect library name', frequency: 'single', impact: 'Low precision.', evidence: [{ speaker: 'Candidate', quote: 'used styles company for the design system' }] }
      ],
      corrections: [
        { speaker: 'Candidate', category: 'vocabulary', sourceType: 'learner_error', original: 'full psych', corrected: 'full stack', explanation: 'Job title.', rule: '', recurrence: 'single', priority: 'low', evidence: [{ speaker: 'Candidate', quote: 'full psych … full stack developer' }] },
        { speaker: 'Candidate', category: 'vocabulary', sourceType: 'transcription_uncertain', original: 'styles company', corrected: 'Styled Components', explanation: 'Technical name.', rule: '', recurrence: 'single', priority: 'low', evidence: [{ speaker: 'Candidate', quote: 'used styles company for the design system' }] }
      ]
    }
  }, transcript, ['language']);

  assert.equal(sanitized.languageClass.corrections.length, 0);
  assert.equal(sanitized.languageClass.languagePatterns.length, 0);
  assert.equal(sanitized.evidenceQuality.transcriptionUncertainties.length, 1);
  assert.equal(sanitized.evidenceQuality.transcriptionUncertainties[0].probableReading, 'Styled Components');
  assert.equal(sanitized.evidenceQuality.transcriptionUncertainties[0].affectsAssessment, false);
  assert.equal(sanitized.evidenceQuality.level, 'medium');
  assert.match(sanitized.evidenceQuality.reasons.at(-1), /excluded from negative assessment/);
});

test('analysis sanitizer preserves the numeric evidence dimension inside question reviews', () => {
  const transcript = 'Interviewer: Tell me about the launch. Candidate: I led the staged rollout with three teams.';
  const raw = buildAnalysisOutputContract(['interview']);
  raw.interview.questionReviews[0] = {
    ...raw.interview.questionReviews[0],
    question: 'Tell me about the launch.',
    answerSummary: 'The candidate described rollout ownership.',
    dimensions: { relevance: 8, specificity: 8, structure: 7, evidence: 8, ownership: 9, impact: 6 },
    evidence: [{ speaker: 'Candidate', quote: 'I led the staged rollout with three teams' }]
  };
  const sanitized = sanitizeAnalysisResult(raw, transcript, ['interview']);
  assert.equal(sanitized.interview.questionReviews[0].dimensions.evidence, 8);
});

test('JSON completion parses fenced output and reports usage with mocked provider', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '```json\n{"ok":true}\n```' } }], usage: { total_tokens: 321, cost: 0.004 } })
  });
  const result = await completeJsonWithOpenRouter({ apiKey: 'test', model: 'judge', systemPrompt: 'system', userPrompt: 'user' });
  assert.deepEqual(result.data, { ok: true });
  assert.deepEqual(result.usage, { totalTokens: 321, costUsd: 0.004 });
});

test('JSON completion extracts the first complete object when a provider appends text', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '{"ok":true,"text":"brace } inside"}\nExtra provider commentary' } }], usage: { total_tokens: 10, cost: 0.001 } })
  });
  const result = await completeJsonWithOpenRouter({ apiKey: 'test', model: 'candidate', systemPrompt: 'system', userPrompt: 'user' });
  assert.deepEqual(result.data, { ok: true, text: 'brace } inside' });
});

test('JSON completion requires schema support, private-data routing and reasoning when requested', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let requestBody;
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }], usage: { total_tokens: 10, cost: 0.001 } })
    };
  };
  await completeJsonWithOpenRouter({
    apiKey: 'test',
    model: 'frontier',
    systemPrompt: 'system',
    userPrompt: 'user',
    responseSchema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
    reasoningEffort: 'medium'
  });
  assert.equal(requestBody.response_format.type, 'json_schema');
  assert.equal(requestBody.response_format.json_schema.strict, true);
  assert.deepEqual(requestBody.provider, { require_parameters: true, data_collection: 'deny' });
  assert.deepEqual(requestBody.reasoning, { effort: 'medium', exclude: true });
});

test('JSON completion rejects truncated executive reports', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"partial":true}' } }] })
  });
  await assert.rejects(
    completeJsonWithOpenRouter({ apiKey: 'test', model: 'frontier', systemPrompt: 'system', userPrompt: 'user' }),
    /truncated/
  );
});
