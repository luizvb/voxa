const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = process.env.VOXA_SYSTEM_PROMPT || '';

if (!SYSTEM_PROMPT) {
  console.warn('Warning: VOXA_SYSTEM_PROMPT is not defined in .env');
}

export interface LLMUsage {
  totalTokens: number;
  costUsd: number;
}

export interface AnalysisResult {
  data: any;
  usage: LLMUsage;
}

export async function analyzeTranscriptWithOpenRouter(apiKey: string, transcriptText: string, model: string = 'google/gemini-2.5-flash-lite-preview-07-24'): Promise<AnalysisResult> {
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in .env file.');
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Please analyze this transcript:\n\n${transcriptText}` }
      ],
      response_format: { type: 'json_object' } 
    })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.error) {
    throw new Error(`OpenRouter AI failed: ${body.error?.message || response.statusText}`);
  }

  const rawContent = body.choices?.[0]?.message?.content || '{}';

  let cleanContent = rawContent.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  try {
    const data = JSON.parse(cleanContent);
    const totalTokens = body.usage?.total_tokens || 0;
    const costUsd = totalTokens * (0.075 / 1000000); 
    
    return {
      data,
      usage: {
        totalTokens,
        costUsd
      }
    };
  } catch (e: any) {
    throw new Error(`Failed to parse AI response as JSON: ${e.message}\nResponse was: ${cleanContent}`);
  }
}
