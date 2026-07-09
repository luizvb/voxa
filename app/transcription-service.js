const fs = require('node:fs/promises');

const DEEPGRAM_ENDPOINT = 'https://api.deepgram.com/v1/listen';

function createDeepgramUrl(options = {}) {
  const params = new URLSearchParams({
    model: 'nova-3',
    diarize_model: 'latest',
    smart_format: 'true',
    punctuate: 'true',
    detect_language: 'true',
    paragraphs: 'true',
    utterances: 'true',
    diarize: 'true',
    multichannel: 'true'
  });

  return `${DEEPGRAM_ENDPOINT}?${params.toString()}`;
}

function createMarkdown(transcript) {
  const utterances = transcript.results?.utterances || [];
  if (utterances.length > 0) {
    return utterances.map((utterance) => {
      const speaker = `Speaker ${utterance.speaker ?? 'unknown'}`;
      return `**${speaker}** (${formatTimestamp(utterance.start)})\n${utterance.transcript}`;
    }).join('\n\n');
  }

  const words = transcript.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  if (words.length === 0) {
    return transcript.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  }

  const blocks = [];
  let currentSpeaker = words[0]?.speaker;
  let currentWords = [];
  let currentStart = words[0]?.start || 0;

  for (const word of words) {
    if (word.speaker !== currentSpeaker && currentWords.length > 0) {
      blocks.push(formatSpeakerBlock(currentSpeaker, currentStart, currentWords));
      currentSpeaker = word.speaker;
      currentStart = word.start || 0;
      currentWords = [];
    }
    currentWords.push(word.punctuated_word || word.word);
  }

  if (currentWords.length > 0) {
    blocks.push(formatSpeakerBlock(currentSpeaker, currentStart, currentWords));
  }

  return blocks.join('\n\n');
}

function formatSpeakerBlock(speaker, start, words) {
  return `**Speaker ${speaker ?? 'unknown'}** (${formatTimestamp(start)})\n${words.join(' ')}`;
}

function formatTimestamp(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const remainder = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

async function transcribeWithDeepgram({ apiKey, filePath, mimeType, maxQuality = false }) {
  if (!apiKey) {
    throw new Error('Missing DEEPGRAM_API_KEY. Set it in your shell before running the app.');
  }

  const audio = await fs.readFile(filePath);
  const response = await fetch(createDeepgramUrl({ maxQuality }), {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/webm'
    },
    body: audio
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.err_msg || body.error || response.statusText;
    throw new Error(`Deepgram transcription failed: ${message}`);
  }

  return {
    provider: 'deepgram',
    quality: maxQuality ? 'max' : 'standard',
    transcript: body,
    markdown: createMarkdown(body)
  };
}

module.exports = {
  createDeepgramUrl,
  createMarkdown,
  transcribeWithDeepgram
};
