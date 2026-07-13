import type { TranscriptionLanguage } from '../platform/types';

const STORAGE_KEY = 'voxa_transcription_language';

export const TRANSCRIPTION_LANGUAGES: TranscriptionLanguage[] = ['en-US', 'pt-BR', 'es'];

export function defaultTranscriptionLanguage(interfaceLanguage: string): TranscriptionLanguage {
  if (interfaceLanguage === 'pt') return 'pt-BR';
  if (interfaceLanguage === 'es') return 'es';
  return 'en-US';
}

export function getSavedTranscriptionLanguage(interfaceLanguage: string): TranscriptionLanguage {
  const saved = localStorage.getItem(STORAGE_KEY);
  return TRANSCRIPTION_LANGUAGES.includes(saved as TranscriptionLanguage)
    ? saved as TranscriptionLanguage
    : defaultTranscriptionLanguage(interfaceLanguage);
}

export function saveTranscriptionLanguage(language: TranscriptionLanguage): void {
  localStorage.setItem(STORAGE_KEY, language);
}
