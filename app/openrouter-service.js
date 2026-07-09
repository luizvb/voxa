const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `
You are an expert Linguistic Evaluator and Behavioral NLP Analyst. 
Your task is to analyze a conversation transcript and evaluate the English proficiency and psychological/behavioral state of EACH speaker.

You MUST return the result EXACTLY as a JSON object with this exact structure (no markdown fences, no extra text):

{
  "summary": {
    "intent": "The main goal or context of the conversation.",
    "overview": "A brief summary of what happened."
  },
  "speakers": [
    {
      "id": "Speaker 0",
      "proficiency": {
        "level": "B2",
        "range": "Analysis of vocabulary range.",
        "accuracy": "Analysis of grammatical accuracy.",
        "fluency": "Analysis of fluency and delivery.",
        "coherence": "Analysis of logical flow.",
        "interaction": "How well they interacted in the conversation."
      },
      "nlp": "Behavioral analysis: were they nervous? confident? thinking while speaking? engaged?",
      "feedback": "Actionable feedback for this speaker."
    }
  ]
}

- The 'level' MUST be one of: A1, A2, B1, B2, C1, C2.
- Evaluate each speaker present in the transcript separately.
- Do NOT wrap the JSON in \`\`\`json or any other formatting. Return ONLY raw valid JSON.
`;

async function analyzeTranscriptWithOpenRouter(apiKey, transcriptText, model = 'google/gemini-3.1-flash-lite') {
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
      response_format: { type: 'json_object' } // Ensure JSON for supported models
    })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.error) {
    throw new Error(`OpenRouter AI failed: ${body.error?.message || response.statusText}`);
  }

  const rawContent = body.choices?.[0]?.message?.content || '{}';

  // Clean up potential markdown fences if the model ignored our instruction
  let cleanContent = rawContent.trim();
  if (cleanContent.startsWith('\`\`\`json')) {
    cleanContent = cleanContent.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
  } else if (cleanContent.startsWith('\`\`\`')) {
    cleanContent = cleanContent.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
  }

  try {
    return JSON.parse(cleanContent);
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${e.message}\nResponse was: ${cleanContent}`);
  }
}

module.exports = {
  analyzeTranscriptWithOpenRouter
};
