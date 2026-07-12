import AIAnalysis from './AIAnalysis';

const evidence = (speaker: string, quote: string) => [{ speaker, quote }];

const sample = {
  version: '4.0',
  analysisModes: ['interview', 'language', 'meeting'],
  summary: {
    title: 'Product migration review',
    purpose: { statement: 'Review a staged migration plan, evaluate the candidate explanation and practice concise English updates.', evidence: evidence('Morgan', 'Today we will review the migration plan and practice a concise project update') },
    executiveBrief: { statement: 'The team chose a staged migration. Alex demonstrated clear ownership and measurable impact, but the decision trade-offs and rollback threshold still need stronger explanation.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') },
    keyPoints: [
      { category: 'decision', statement: 'The migration will run in two controlled stages.', evidence: evidence('Morgan', 'We will split the migration into two stages') },
      { category: 'risk', statement: 'The rollback threshold remains unapproved.', evidence: evidence('Morgan', 'We still need approval for the rollback threshold') },
      { category: 'coaching', statement: 'Alex should make decision trade-offs explicit.', evidence: evidence('Interviewer', 'What did you choose not to do and why') },
    ],
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
    }, strengths: [{ signal: 'Concrete professional vocabulary', whyItMatters: 'Makes delivery experience easy to follow.', evidence: evidence('Alex', 'I owned the migration plan and reduced failed imports by thirty percent') }], priorities: [{ signal: 'Past-tense consistency', pattern: 'Switches tense inside a completed narrative.', communicationImpact: 'The timeline becomes less precise.', nextStep: 'Retell the project using five fixed past-tense milestones.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') }], participation: { share: 'balanced', interactionPattern: 'Answers fully and asks one relevant question.', evidence: evidence('Alex', 'How will success be measured in the first ninety days') }, teacherFeedback: 'Keep the technical specificity and stabilize the project timeline.' }],
    languagePatterns: [{ category: 'grammar', pattern: 'Past-tense switching', frequency: 'repeated', impact: 'Weakens chronology in completed project stories.', evidence: evidence('Alex', 'Last year I lead the migration and now I fixed the import errors') }],
    corrections: [{ speaker: 'Alex', category: 'grammar', original: 'Last year I lead the migration', corrected: 'Last year I led the migration', explanation: 'Use the irregular past form for a completed event.', rule: 'lead becomes led in the past', recurrence: 'repeated', priority: 'high', evidence: evidence('Alex', 'Last year I lead the migration') }],
    lessonProgress: { successfulUse: [{ skill: 'Quantified an outcome clearly.', whySuccessful: 'The metric makes the result concrete.', evidence: evidence('Alex', 'reduced failed imports by thirty percent') }], selfCorrections: [{ observation: 'Repaired the verb form after noticing the error.', significance: 'Shows active monitoring.', evidence: evidence('Alex', 'I lead, sorry, I led the migration') }], missedOpportunities: [{ opportunity: 'Add a causal connector before the result.', coachPrompt: 'Try again using therefore or as a result.', evidence: evidence('Alex', 'The validation failed. We changed the import rule') }] },
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

export default function InsightsPreview() {
  return <main className="insights-preview"><header><span>Voxa UI preview</span><h1>Specialist insights</h1><p>Development fixture for the structured v4 report.</p></header><AIAnalysis analysis={sample} /></main>;
}
