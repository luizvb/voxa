import AIAnalysis from './AIAnalysis';

const evidence = (speaker: string, quote: string) => [{ speaker, quote }];

const sample = {
  version: '3.0',
  analysisModes: ['interview', 'language', 'meeting'],
  summary: {
    title: 'Specialist review of a product conversation',
    overview: 'A grounded sample showing how the same conversation becomes a hiring review, teacher brief and manager recap.',
    language: 'en-US',
  },
  evidenceQuality: {
    level: 'medium',
    reasons: ['Speaker labels are stable and the transcript contains explicit commitments.'],
    limitations: ['Pronunciation cannot be assessed from a text transcript.'],
  },
  interview: {
    scorecard: { overallScore: 7.4, scoreConfidence: 'medium', outcomeForecast: 'uncertain', rationale: 'The candidate showed ownership and measurable impact, but the role criteria were not supplied.', caveat: 'Directional coaching estimate.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') },
    strengths: [{ insight: 'Clear ownership', whyItMatters: 'The answer separates personal contribution from team output.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }],
    concerns: [{ insight: 'Trade-offs were not explained', severity: 'medium', missingEvidence: 'The answer did not compare alternatives or downside.', evidence: evidence('Interviewer', 'What did you choose not to do and why') }],
    competencies: [{ name: 'Execution', score: 8, assessment: 'Specific action and measurable result.', gap: 'Add the decision trade-off.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }],
    questionReviews: [{ question: 'Tell me about the migration you led.', score: 7, answerSummary: 'Alex described ownership and impact, with limited decision context.', whatWorked: ['Specific responsibility', 'Measurable result'], improve: ['Explain alternatives', 'Name the hardest constraint'], betterAnswerOutline: 'Context, decision, trade-off, action, result and learning.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }],
    candidateQuestions: [{ question: 'How will success be measured in the first ninety days?', evidence: evidence('Alex', 'How will success be measured in the first ninety days') }],
    preparationPlan: [{ priority: 1, focus: 'Decision trade-offs', basedOn: 'Strong execution evidence, thin decision rationale.', actions: ['Prepare two alternatives for each story', 'State the downside you accepted'], successMetric: 'Each answer names one rejected alternative.' }],
    practiceQuestions: [{ question: 'Which alternative did you reject, and what risk did you accept?', why: 'Tests decision clarity.', targetSignal: 'Explicit trade-off reasoning' }],
  },
  languageClass: {
    lessonBrief: { objective: 'Practice concise project updates and past-tense narratives.', learnerSpeakers: ['Alex'], teacherSpeakers: ['Morgan'], evidence: evidence('Morgan', 'Today we are practicing concise project updates in the past tense') },
    learnerProfiles: [{ speaker: 'Alex', cefrEstimate: 'B2', evidenceSufficiency: 'medium', scores: { grammar: 7, vocabulary: 8, fluency: 7, coherence: 8, interaction: 8, intelligibility: null }, strengths: [{ insight: 'Uses concrete delivery vocabulary accurately.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }], priorities: [{ insight: 'Past-tense consistency', pattern: 'Switches from past to present inside the same project narrative.', impact: 'The timeline becomes less precise.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') }], teacherFeedback: 'Strong professional vocabulary. Focus the next lesson on stable chronology and compact answer structure.' }],
    lessonProgress: { successfulUse: [{ skill: 'Quantified an outcome clearly.', evidence: evidence('Alex', 'reduced failed imports by thirty percent') }], recurringPatterns: [{ pattern: 'Past-tense switching', frequency: 'repeated', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') }], selfCorrections: [{ observation: 'Repaired the verb form after prompting.', evidence: evidence('Alex', 'I lead, sorry, I led the migration') }], missedOpportunities: [{ opportunity: 'Add a causal connector before the result.', coachPrompt: 'Try the sentence again with therefore or as a result.', evidence: evidence('Alex', 'The validation failed. We changed the import rule') }] },
    corrections: [{ speaker: 'Alex', category: 'grammar', original: 'Last year I lead the migration', corrected: 'Last year I led the migration', explanation: 'Use the irregular past form led for a completed event.', priority: 'high' }],
    teacherBrief: { whatToReinforce: ['Specific delivery vocabulary', 'Measured outcomes'], nextLessonFocus: [{ focus: 'Stable project chronology', why: 'The learner switches tense inside completed narratives.', activities: ['Timeline retell with five milestones', 'Rapid past-form correction drill'], successMetric: 'Maintain past tense across a two-minute project story.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') }], homework: [{ task: 'Record a two-minute project story', durationMinutes: 10, successMetric: 'Use five past-tense verbs and two causal connectors.' }] },
  },
  meeting: {
    managerBrief: { outcome: 'The team selected a staged migration and assigned the validation pass.', whatChanged: ['Full cutover was replaced by two controlled stages.'], needsDecision: ['Approve the rollback threshold.'], needsEscalation: ['Confirm vendor availability for Friday.'] },
    topics: [{ topic: 'Migration sequence', status: 'resolved', summary: 'Two stages reduce blast radius.', evidence: evidence('Morgan', 'We will split the migration into two stages') }],
    participantSummaries: [{ speaker: 'Morgan', statedPosition: 'Supports staged rollout.', commitments: ['Review stage-one metrics.'], evidence: evidence('Morgan', 'I will review the stage-one metrics on Friday') }],
    decisions: [{ decision: 'Run the migration in two stages.', owner: null, impact: 'Reduces the size of a rollback.', evidence: evidence('Morgan', 'We will split the migration into two stages') }],
    proposals: [{ proposal: 'Use a five-percent rollback threshold.', proposedBy: 'Alex', status: 'open', evidence: evidence('Alex', 'I propose a five-percent rollback threshold') }],
    actionItems: [{ task: 'Review stage-one metrics.', owner: 'Morgan', dueDate: 'Friday', status: 'open', evidence: evidence('Morgan', 'I will review the stage-one metrics on Friday') }],
    risks: [{ risk: 'Vendor support may be unavailable during rollback.', basis: 'explicit', impact: 'Recovery could take longer.', mitigation: 'Confirm the escalation contact.', evidence: evidence('Alex', 'The vendor has not confirmed rollback support yet') }],
    blockers: [{ blocker: 'Rollback threshold is not approved.', owner: null, evidence: evidence('Morgan', 'We still need approval for the rollback threshold') }],
    metrics: [{ metric: 'Failed import reduction', value: '30%', context: 'Previous migration result.', evidence: evidence('Alex', 'reduced failed imports by thirty percent') }],
    openQuestions: [{ question: 'Who approves the rollback threshold?', owner: null, evidence: evidence('Morgan', 'Who can approve the rollback threshold') }],
    nextMeeting: { recommended: true, objective: 'Approve the threshold and confirm vendor coverage.', timing: null, participants: [], agenda: ['Threshold decision', 'Vendor escalation path'], rationale: 'Two execution dependencies remain open.' },
  },
};

export default function InsightsPreview() {
  return <main className="insights-preview"><header><span>Voxa UI preview</span><h1>Specialist insights</h1><p>Development-only fixture for responsive and PDF-aligned visual QA.</p></header><AIAnalysis analysis={sample} /></main>;
}
