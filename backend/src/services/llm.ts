const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export const ANALYSIS_MODES = ['interview', 'language', 'meeting'] as const;
export type AnalysisMode = typeof ANALYSIS_MODES[number];

const DEFAULT_SYSTEM_PROMPT = `You are Voxa, a rigorous conversation analyst. Turn transcripts into evidence-grounded, practical reports.

Rules:
- Use only evidence present in the transcript. Never invent questions, decisions, owners, deadlines, emotions, or facts.
- Separate observation from inference. Use null or an empty array when evidence is missing.
- Confidence and nervousness are communication-signal estimates, not psychological diagnoses. Base them on observable wording, answer structure, hesitation markers present in the transcript, self-correction, specificity, and interaction patterns. Always include a caveat.
- Interview outcome is directional coaching, not a hiring decision. Explain uncertainty and do not infer protected or sensitive traits.
- Keep feedback candid, specific, constructive, and suitable for an executive reader.
- Quote only short transcript fragments as evidence.
- Return valid JSON only, using the exact top-level structure requested.`;

export interface LLMUsage {
  totalTokens: number;
  costUsd: number;
}

export interface AnalysisResult {
  data: any;
  usage: LLMUsage;
}

export interface AnalyzeOptions {
  modes?: AnalysisMode[];
  outputLanguage?: string;
  context?: string;
}

export function normalizeAnalysisModes(value: unknown): AnalysisMode[] {
  if (!Array.isArray(value)) return ['language'];
  const modes = value.filter((mode): mode is AnalysisMode => ANALYSIS_MODES.includes(mode as AnalysisMode));
  const uniqueModes = [...new Set(modes)].slice(0, ANALYSIS_MODES.length);
  return uniqueModes.length > 0 ? uniqueModes : ['language'];
}

export function buildAnalysisPrompt(transcriptText: string, options: AnalyzeOptions = {}): string {
  const modes = normalizeAnalysisModes(options.modes);
  const outputLanguage = String(options.outputLanguage || 'pt-BR').slice(0, 32);
  const context = String(options.context || '').trim().slice(0, 2000);

  const modeInstructions: Record<AnalysisMode, string> = {
    interview: `INTERVIEW: Identify interviewer/candidate when possible. Extract every substantive question and assess the answer for relevance, specificity, structure, evidence, ownership, trade-offs and impact. Score questions and job-related competencies from 0-10. Provide a calibrated outcome forecast (likely_advance, uncertain, likely_not_advance), rationale, missing evidence, improved answer outlines, follow-up questions, practice questions and a prioritized preparation plan.`,
    language: `LANGUAGE CLASS: Assess each relevant speaker's communicative language performance: estimated CEFR, grammar accuracy/range, vocabulary range/precision, fluency, pronunciation/intelligibility only when supported by the transcript, coherence and interaction. Include what went well, recurring patterns, high-value corrections (original, corrected, explanation), natural alternatives, and a time-boxed study plan with measurable success criteria. Do not overclaim pronunciation from text alone.`,
    meeting: `MEETING: Produce an executive summary, topics, speaker summaries, decisions, action items, risks, opportunities, unresolved questions and recommended next meeting. Every action item must include task, owner, due date and evidence; use null when owner/date were not stated. Distinguish confirmed decisions from proposals. Add an executive/CEO lens: business impact, alignment gaps, dependencies and what needs escalation.`
  };

  return `Create a Voxa analysis in ${outputLanguage}.
Selected modes: ${modes.join(', ')}.
${context ? `Optional user context (treat as context, not transcript evidence): ${context}\n` : ''}
${modes.map((mode) => modeInstructions[mode]).join('\n')}

Return this JSON structure. Include only the selected mode objects; set unselected mode objects to null:
{
  "version": "2.0",
  "analysisModes": ${JSON.stringify(modes)},
  "summary": { "title": "", "intent": "", "overview": "", "language": "" },
  "evidenceQuality": { "level": "high|medium|low", "limitations": [] },
  "executiveSignals": { "keyTakeaways": [], "risks": [], "opportunities": [], "unresolvedQuestions": [] },
  "speakers": [{
    "id": "Speaker 0", "role": null, "overview": "",
    "communicationSignals": {
      "confidence": { "level": "high|medium|low|unknown", "evidence": [], "caveat": "" },
      "nervousness": { "level": "high|medium|low|unknown", "evidence": [], "caveat": "" }
    },
    "language": {
      "cefrEstimate": "A1|A2|B1|B2|C1|C2|unknown",
      "scores": { "grammar": 0, "vocabulary": 0, "fluency": 0, "intelligibility": 0, "coherence": 0, "interaction": 0 },
      "strengths": [], "improvements": [],
      "corrections": [{ "original": "", "corrected": "", "explanation": "" }],
      "feedback": ""
    }
  }],
  "interview": {
    "overallScore": 0,
    "outcomeForecast": { "label": "likely_advance|uncertain|likely_not_advance", "confidence": 0, "rationale": "", "caveat": "" },
    "competencies": [{ "name": "", "score": 0, "evidence": [], "gap": "" }],
    "questions": [{ "question": "", "answerSummary": "", "score": 0, "whatWorked": [], "improve": [], "betterAnswerOutline": "", "followUps": [] }],
    "preparationPlan": [{ "priority": 1, "focus": "", "actions": [], "successMetric": "" }],
    "practiceQuestions": [{ "question": "", "why": "" }]
  },
  "languageClass": {
    "overallCefr": "A1|A2|B1|B2|C1|C2|unknown",
    "overallScore": 0,
    "whatWentWell": [], "needsWork": [],
    "corrections": [{ "speaker": "", "original": "", "corrected": "", "explanation": "", "priority": "high|medium|low" }],
    "naturalAlternatives": [{ "insteadOf": "", "try": "", "context": "" }],
    "studyPlan": [{ "period": "", "focus": "", "activities": [], "successMetric": "" }]
  },
  "meeting": {
    "executiveSummary": "", "topics": [],
    "speakerSummaries": [{ "speaker": "", "summary": "", "commitments": [] }],
    "decisions": [{ "decision": "", "owner": null, "evidence": "" }],
    "actionItems": [{ "task": "", "owner": null, "dueDate": null, "status": "open", "evidence": "" }],
    "risks": [{ "risk": "", "impact": "", "mitigation": "" }],
    "opportunities": [{ "opportunity": "", "value": "", "nextStep": "" }],
    "openQuestions": [],
    "nextMeeting": { "recommended": true, "objective": "", "timing": "", "participants": [], "agenda": [] }
  }
}

Transcript:
${transcriptText}`;
}

export async function analyzeTranscriptWithOpenRouter(
  apiKey: string,
  transcriptText: string,
  model: string = 'google/gemini-2.5-flash-lite-preview-07-24',
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY in .env file.');

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: process.env.VOXA_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: buildAnalysisPrompt(transcriptText, options) }
      ],
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(`OpenRouter AI failed: ${body.error?.message || response.statusText}`);
  }

  const rawContent = body.choices?.[0]?.message?.content || '{}';
  let cleanContent = rawContent.trim();
  if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');

  try {
    const data = JSON.parse(cleanContent);
    data.version ||= '2.0';
    data.analysisModes = normalizeAnalysisModes(data.analysisModes || options.modes);
    const totalTokens = body.usage?.total_tokens || 0;
    const reportedCost = Number(body.usage?.cost);
    return {
      data,
      usage: {
        totalTokens,
        costUsd: Number.isFinite(reportedCost) ? reportedCost : totalTokens * (0.075 / 1_000_000)
      }
    };
  } catch (error: any) {
    throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
  }
}
