type ReportRecord = Record<string, any>;

const array = (value: unknown): any[] => Array.isArray(value) ? value : [];

function statementObject(value: unknown): ReportRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as ReportRecord;
  if (typeof value === 'string' && value.trim()) return { statement: value, evidence: [] };
  return { statement: '', evidence: [] };
}

function fallbackFindings(summary: ReportRecord): any[] {
  const current = array(summary.keyFindings);
  if (current.length) return current;
  const legacy = array(summary.criticalFindings);
  if (legacy.length) return legacy;
  return array(summary.keyPoints).map((item) => {
    const source = item && typeof item === 'object' ? item : { statement: item };
    return {
      finding: source.finding || source.statement || '',
      significance: source.significance || '',
      businessImpact: source.businessImpact || '',
      confidence: source.confidence || 'low',
      evidence: array(source.evidence),
    };
  }).filter((item) => item.finding);
}

export function normalizeAnalysisReport(value: unknown): ReportRecord {
  const report = value && typeof value === 'object' && !Array.isArray(value) ? value as ReportRecord : {};
  const legacySummary = report.summary && typeof report.summary === 'object' ? report.summary : {};
  const bottomLineSource = legacySummary.bottomLine || legacySummary.executiveBrief || legacySummary.overview;
  return {
    ...report,
    summary: {
      title: String(legacySummary.title || ''),
      purpose: statementObject(legacySummary.purpose),
      bottomLine: {
        confidence: 'low',
        ...statementObject(bottomLineSource),
      },
      keyFindings: fallbackFindings(legacySummary),
      recommendedActions: array(legacySummary.recommendedActions),
      unansweredQuestions: array(legacySummary.unansweredQuestions),
      language: String(legacySummary.language || ''),
    },
  };
}
