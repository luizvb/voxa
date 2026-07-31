import AIAnalysis from './AIAnalysis';

const previewEvidenceCatalog: Array<{ citationId: string; turnId: string; speaker: string; quote: string }> = [];
const evidence = (speaker: string, quote: string) => {
  let citation = previewEvidenceCatalog.find((item) => item.speaker === speaker && item.quote === quote);
  if (!citation) {
    citation = { citationId: `E${String(previewEvidenceCatalog.length + 1).padStart(3, '0')}`, turnId: `T${String(previewEvidenceCatalog.length + 1).padStart(3, '0')}`, speaker, quote };
    previewEvidenceCatalog.push(citation);
  }
  return [{ ...citation }];
};

const sample = {
  version: '7.0',
  analysisModes: ['interview', 'language', 'meeting'],
  summary: {
    title: 'Product migration review',
    purpose: { statement: 'Review a staged migration plan, evaluate the candidate explanation and practice concise English updates.', evidence: evidence('Morgan', 'Today we will review the migration plan and practice a concise project update') },
    bottomLine: { statement: 'Proceed with the staged migration, but approve the rollback threshold before execution.', confidence: 'high', evidence: evidence('Morgan', 'We will split the migration into two stages') },
    keyFindings: [
      { finding: 'The migration will run in two controlled stages.', significance: 'The team replaced a full cutover with a lower-risk sequence.', businessImpact: 'Limits the blast radius of import failures.', confidence: 'high', evidence: evidence('Morgan', 'We will split the migration into two stages') },
      { finding: 'The rollback threshold remains unapproved.', significance: 'The team lacks a shared stop condition.', businessImpact: 'Execution could continue after risk becomes unacceptable.', confidence: 'high', evidence: evidence('Morgan', 'We still need approval for the rollback threshold') },
    ],
    recommendedActions: [{ action: 'Approve the rollback threshold before the first stage.', priority: 'immediate', rationale: 'The threshold is the remaining execution control.', expectedOutcome: 'A clear go/no-go rule for the migration.', evidence: evidence('Morgan', 'We still need approval for the rollback threshold') }],
    unansweredQuestions: [{ question: 'Which signal triggers rollback?', whyItMatters: 'The operating decision cannot be enforced without a measurable trigger.', evidence: evidence('Morgan', 'We still need approval for the rollback threshold') }],
    language: 'en-US',
  },
  evidenceQuality: { level: 'high', coverage: { speakerLabels: 'clear', substantiveTurns: 18, selectedModeFit: 'high' }, reasons: ['Stable labels and explicit commitments.'], limitations: ['Pronunciation cannot be assessed from text.'] },
  interview: {
    context: { interviewType: 'behavioral', stage: 'technical panel', targetRole: 'Principal Engineer', candidate: 'Alex', interviewers: ['Morgan'], criteriaAvailable: true, evidence: evidence('Morgan', 'For this Principal Engineer interview I want to understand how you make trade-offs') },
    executiveAssessment: { overallScore: 7.4, scoreConfidence: 'medium', outcomeForecast: 'uncertain', rationale: 'Strong delivery evidence, with incomplete decision rationale and one chronology conflict.', caveat: 'The final decision depends on role criteria outside this excerpt.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') },
    strengths: [{ signal: 'Clear ownership', demonstratedBy: 'Alex separates his responsibility from the team outcome.', hiringRelevance: 'Supports execution and accountability.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }],
    concerns: [{ signal: 'Trade-offs remain vague', severity: 'medium', observedIssue: 'The answer names the chosen path but not the rejected alternatives.', missingProof: 'No downside or rejected option is explained.', verificationQuestion: 'Which alternative did you reject and what risk did you accept?', evidence: evidence('Interviewer', 'What did you choose not to do and why') }],
    contradictions: [{ topic: 'Migration timing', firstStatement: 'The migration started last year.', secondStatement: 'The migration started in March.', whyItMatters: 'The project chronology is unclear.', verificationQuestion: 'Was March part of last year or a later restart?', evidence: [{ speaker: 'Alex', quote: 'We started the migration last year' }, { speaker: 'Alex', quote: 'The migration started in March' }] }],
    competencies: [{ name: 'Execution', score: 8, confidence: 'high', demonstrated: 'Owned the plan and quantified the result.', missing: 'Explain the rejected alternative.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }],
    questionReviews: [{ question: 'Tell me about the migration you led.', askedBy: 'Morgan', answeredBy: 'Alex', answerSummary: 'Alex explains ownership and impact but gives limited decision context.', score: 7, dimensions: { relevance: 8, specificity: 7, structure: 7, evidence: 8, ownership: 9, impact: 8 }, whatWorked: ['Specific responsibility', 'Measurable result'], improve: ['Explain alternatives', 'Name the hardest constraint'], betterAnswerOutline: 'Context, options, decision, accepted risk, action, result and learning.', followUps: ['What failed during the first stage?', 'Which signal would trigger rollback?'], evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }],
    coaching: {
      priorities: [{ priority: 1, focus: 'Decision trade-offs', basedOn: 'Strong execution evidence with thin decision rationale.', actions: ['Prepare two alternatives for each story', 'State the downside you accepted'], successMetric: 'Every answer names one rejected option.', evidence: evidence('Interviewer', 'What did you choose not to do and why') }],
      candidateQuestions: [{ question: 'How will success be measured in the first ninety days?', whyAsk: 'Clarifies the role evaluation criteria.', evidence: evidence('Alex', 'How will success be measured in the first ninety days') }],
      practiceQuestions: [{ question: 'Which alternative did you reject?', why: 'Tests decision clarity.', targetSignal: 'Explicit trade-off reasoning', evidence: evidence('Interviewer', 'What did you choose not to do and why') }],
    },
  },
  languageClass: {
    lessonContext: { objective: 'Practice concise project updates and past-tense narratives.', targetLanguage: 'English', learnerSpeakers: ['Alex'], teacherSpeakers: ['Morgan'], topics: ['project chronology', 'causal connectors'], evidence: evidence('Morgan', 'Today we are practicing concise project updates in the past tense') },
    learnerProfiles: [{ speaker: 'Alex', cefr: { level: 'B2', confidence: 'medium', rationale: 'The learner explains technical work with specific vocabulary and connected ideas.' }, evidenceSufficiency: 'high', overallAssessment: 'Strong professional vocabulary. Chronology becomes less precise when verb tense shifts.', skills: {
      grammar: { score: 7, observation: 'Mostly accurate, with repeated past-tense switching.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') },
      vocabulary: { score: 8, observation: 'Uses specific delivery and migration vocabulary.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') },
      fluency: { score: 7, observation: 'Maintains the explanation with one visible repair.', evidence: evidence('Alex', 'I lead, sorry, I led the migration') },
      coherence: { score: 8, observation: 'Connects actions to results clearly.', evidence: evidence('Alex', 'We changed the import rule and reduced failed imports by thirty percent') },
      interaction: { score: 8, observation: 'Responds directly and asks a relevant closing question.', evidence: evidence('Alex', 'How will success be measured in the first ninety days') },
      intelligibility: { score: null, observation: '', evidence: [] },
    }, strengths: [{ signal: 'Concrete professional vocabulary', whyItMatters: 'Makes delivery experience easy to follow.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }], priorities: [{ signal: 'Past-tense consistency', pattern: 'Switches tense inside a completed narrative.', communicationImpact: 'The timeline becomes less precise.', nextStep: 'Retell the project using five fixed past-tense milestones.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') }], participation: { share: 'balanced', interactionPattern: 'Answers fully and asks one relevant question.', evidence: evidence('Alex', 'How will success be measured in the first ninety days') }, teacherFeedback: 'Keep the technical specificity and stabilize the project timeline.' }, { speaker: 'Morgan', cefr: { level: 'C1', confidence: 'medium', rationale: 'Morgan gives concise instructions and frames decisions clearly.' }, evidenceSufficiency: 'medium', overallAssessment: 'Clear facilitation with a small opportunity to simplify long prompts.', skills: { grammar: { score: 9, observation: 'Consistently accurate.', evidence: evidence('Morgan', 'We will split the migration into two stages') }, vocabulary: { score: 8, observation: 'Precise delivery vocabulary.', evidence: evidence('Morgan', 'We still need approval for the rollback threshold') } }, strengths: [], priorities: [], teacherFeedback: 'Keep instructions short and decision-oriented.' }],
    languagePatterns: [
      { speaker: 'Alex', category: 'grammar', pattern: 'Past-tense switching', frequency: 'repeated', impact: 'Weakens chronology in completed project stories.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') },
      { speaker: 'Morgan', category: 'coherence', pattern: 'Decision-first framing', frequency: 'repeated', impact: 'Makes the next action easy to identify.', evidence: evidence('Morgan', 'We still need approval for the rollback threshold') },
      { category: 'interaction', pattern: 'Shared technical vocabulary', frequency: 'observed', impact: 'Both participants use the same migration terms.', evidence: [{ speaker: 'Alex', quote: 'migration plan' }, { speaker: 'Morgan', quote: 'migration sequence' }] },
    ],
    corrections: [{ speaker: 'Alex', category: 'grammar', original: 'Last year I lead the migration', corrected: 'Last year I led the migration', explanation: 'Use the irregular past form for a completed event.', rule: 'lead becomes led in the past', recurrence: 'repeated', priority: 'high', evidence: evidence('Alex', 'Last year I lead the migration') }, { speaker: 'Morgan', category: 'grammar', original: 'We need approve the threshold', corrected: 'We need to approve the threshold', explanation: 'Use the infinitive with “to” after “need”.', priority: 'medium', evidence: evidence('Morgan', 'We need approve the threshold') }],
    lessonProgress: { successfulUse: [{ skill: 'Quantified an outcome clearly.', whySuccessful: 'The metric makes the result concrete.', evidence: evidence('Alex', 'reduced failed imports by thirty percent') }, { skill: 'Aligned on shared terminology.', whySuccessful: 'Both speakers used consistent migration language.', evidence: [{ speaker: 'Alex', quote: 'migration plan' }, { speaker: 'Morgan', quote: 'migration sequence' }] }], selfCorrections: [{ observation: 'Repaired the verb form after noticing the error.', significance: 'Shows active monitoring.', evidence: evidence('Alex', 'I lead, sorry, I led the migration') }], missedOpportunities: [{ opportunity: 'Add a causal connector before the result.', coachPrompt: 'Try again using therefore or as a result.', evidence: evidence('Alex', 'The validation failed. We changed the import rule') }] },
    teacherPlan: { reinforce: [{ focus: 'Measured outcomes', reason: 'The learner already uses metrics effectively.', evidence: evidence('Alex', 'reduced failed imports by thirty percent') }], nextLessonFocus: [{ focus: 'Stable project chronology', why: 'Tense changes blur completed events.', activities: ['Timeline retell with five milestones', 'Rapid past-form repair drill'], successMetric: 'Maintain past tense across a two-minute story.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') }], homework: [{ task: 'Record a two-minute project story', durationMinutes: 10, successMetric: 'Use five past-tense verbs and two causal connectors.', basedOn: 'Chronology and connector gaps.', evidence: evidence('Alex', 'The validation failed. We changed the import rule') }] },
  },
  meeting: {
    meetingContext: { purpose: 'Choose the migration sequence and clarify rollback readiness.', participants: ['Alex', 'Morgan'], topics: ['migration sequence', 'rollback threshold'], evidence: evidence('Morgan', 'We need to choose the migration sequence and confirm rollback readiness') },
    executiveBrief: { outcome: 'The team selected a staged migration and assigned the validation pass.', whatChanged: ['Full cutover was replaced by two stages.'], needsDecision: ['Approve the rollback threshold.'], needsEscalation: ['Confirm vendor availability for Friday.'], evidence: evidence('Morgan', 'We will split the migration into two stages') },
    decisions: [{ decision: 'Run the migration in two stages.', impact: 'Reduces the size of a rollback.', rationale: 'A smaller stage limits blast radius.', owner: null, evidence: evidence('Morgan', 'We will split the migration into two stages') }],
    actionItems: [{ task: 'Review stage-one metrics.', owner: 'Morgan', dueDate: 'Friday', status: 'open', dependency: 'Stage-one data', evidence: evidence('Morgan', 'I will review the stage-one metrics on Friday') }],
    proposals: [{ proposal: 'Use a five-percent rollback threshold.', proposedBy: 'Alex', status: 'open', implication: 'Creates an explicit stop condition.', evidence: evidence('Alex', 'I propose a five-percent rollback threshold') }],
    risks: [{ risk: 'Vendor support may be unavailable during rollback.', basis: 'explicit', likelihood: 'medium', impact: 'Recovery could take longer.', mitigation: 'Confirm the escalation contact before Friday.', evidence: evidence('Alex', 'The vendor has not confirmed rollback support yet') }],
    blockers: [{ blocker: 'Rollback threshold is not approved.', owner: null, consequence: 'The team lacks an agreed stop condition.', evidence: evidence('Morgan', 'We still need approval for the rollback threshold') }],
    dependencies: [{ dependency: 'Stage-one metrics', status: 'at_risk', owner: 'Morgan', evidence: evidence('Morgan', 'I will review the stage-one metrics on Friday') }],
    participantViews: [{ speaker: 'Morgan', position: 'Supports the staged rollout.', commitments: ['Review stage-one metrics.'], concerns: ['Rollback threshold is open.'], evidence: evidence('Morgan', 'I will review the stage-one metrics on Friday') }],
    metrics: [{ metric: 'Failed import reduction', value: '30%', context: 'Previous migration result.', evidence: evidence('Alex', 'reduced failed imports by thirty percent') }],
    openQuestions: [{ question: 'Who approves the rollback threshold?', owner: null, whyItMatters: 'Execution needs a clear decision owner.', evidence: evidence('Morgan', 'Who can approve the rollback threshold') }],
    topics: [{ topic: 'Migration sequence', status: 'resolved', summary: 'Two stages reduce blast radius.', evidence: evidence('Morgan', 'We will split the migration into two stages') }],
    nextMeeting: { recommended: true, objective: 'Approve the threshold and confirm vendor coverage.', timing: null, participants: [], agenda: ['Threshold decision', 'Vendor escalation path'], rationale: 'Two execution dependencies remain open.' },
  },
};

for (let index = 3; index <= 30; index += 1) {
  sample.languageClass.learnerProfiles.push({
    speaker: `Participant ${index}`,
    cefr: { level: 'B1', confidence: 'low', rationale: 'Scale fixture with limited participant evidence.' },
    evidenceSufficiency: 'low',
    overallAssessment: 'No participant-specific language items in this preview.',
    skills: {},
    strengths: [],
    priorities: [],
    teacherFeedback: 'Collect more evidence before assigning a detailed profile.',
  } as any);
}

const previewReferenceCount = (() => {
  let count = 0;
  const visit = (value: any) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, child]) => {
        if (key === 'evidence' && Array.isArray(child)) count += child.length;
        else visit(child);
      });
    }
  };
  visit(sample);
  return count;
})();
Object.assign(sample.evidenceQuality, {
  citationSummary: {
    totalReferences: previewReferenceCount,
    uniqueCitations: previewEvidenceCatalog.length,
    repeatedReferences: previewReferenceCount - previewEvidenceCatalog.length,
    reuseRatio: Number(((previewReferenceCount - previewEvidenceCatalog.length) / previewReferenceCount).toFixed(3))
  },
  evidenceCatalog: previewEvidenceCatalog,
  transcriptionUncertainties: [{
    turnId: 'T018',
    original: 'styles company',
    probableReading: 'Styled Components',
    confidence: 'medium',
    rationale: 'The surrounding React styling context supports a probable technical-name transcription.',
    affectsAssessment: false
  }]
});

const transcriptSegments = [{
  id: 'preview-grammar-segment',
  position: 0,
  speaker: 'Alex',
  text: 'Last year I lead the migration',
  startMs: 12500,
  endMs: 15300,
}, {
  id: 'preview-morgan-grammar-segment',
  position: 1,
  speaker: 'Morgan',
  text: 'We need approve the threshold',
  startMs: 15800,
  endMs: 17900,
}];

export default function InsightsPreview() {
  return <main className="insights-preview"><header><span>Voxa UI preview</span><h1>Specialist insights</h1><p>Development fixture for the progressive v7 report.</p></header><AIAnalysis analysis={sample} grammarAudioEnabled transcriptSegments={transcriptSegments} audioAvailable onPlayAudioSegment={() => {}} /></main>;
}
