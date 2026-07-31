export type LanguageItemScope = 'participant' | 'other' | 'general';

export type LanguageParticipantSources = {
  learnerProfiles?: unknown[] | null;
  legacySpeakers?: unknown[] | null;
  languagePatterns?: unknown[] | null;
  corrections?: unknown[] | null;
  lessonProgress?: Record<string, unknown> | null;
  teacherPlan?: Record<string, unknown> | null;
};

function speakerName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizedSpeaker(value: unknown): string {
  return speakerName(value).toLocaleLowerCase();
}

export function inferLanguageItemSpeaker(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as { speaker?: unknown; evidence?: unknown };
  const explicitSpeaker = speakerName(record.speaker);
  if (explicitSpeaker) return explicitSpeaker;
  if (!Array.isArray(record.evidence) || record.evidence.length === 0) return null;

  const evidenceSpeakers = record.evidence
    .map((entry) => speakerName(entry && typeof entry === 'object' ? (entry as { speaker?: unknown }).speaker : ''))
    .filter(Boolean);
  if (evidenceSpeakers.length !== record.evidence.length) return null;
  const uniqueSpeakers = new Map(evidenceSpeakers.map((speaker) => [normalizedSpeaker(speaker), speaker]));
  return uniqueSpeakers.size === 1 ? uniqueSpeakers.values().next().value || null : null;
}

export function languageItemScope(item: unknown, selectedSpeaker: string): LanguageItemScope {
  const attributedSpeaker = inferLanguageItemSpeaker(item);
  if (!attributedSpeaker) return 'general';
  return normalizedSpeaker(attributedSpeaker) === normalizedSpeaker(selectedSpeaker) ? 'participant' : 'other';
}

export function scopeLanguageItems<T>(items: T[] | null | undefined, selectedSpeaker: string): Array<{ item: T; scope: Exclude<LanguageItemScope, 'other'> }> {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const scope = languageItemScope(item, selectedSpeaker);
    return scope === 'other' ? [] : [{ item, scope }];
  });
}

export function collectLanguageParticipants(sources: LanguageParticipantSources): string[] {
  const participants = new Map<string, string>();
  const add = (value: unknown) => {
    const label = speakerName(value);
    const normalized = normalizedSpeaker(label);
    if (normalized && !participants.has(normalized)) participants.set(normalized, label);
  };
  const addProfileLike = (entry: unknown, legacy = false) => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as { speaker?: unknown; id?: unknown };
    add(record.speaker || (legacy ? record.id : ''));
  };
  const addAttributedItems = (items: unknown) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => add(inferLanguageItemSpeaker(item)));
  };

  sources.learnerProfiles?.forEach((profile) => addProfileLike(profile));
  sources.legacySpeakers?.forEach((speaker) => addProfileLike(speaker, true));
  addAttributedItems(sources.languagePatterns);
  addAttributedItems(sources.corrections);
  Object.values(sources.lessonProgress || {}).forEach(addAttributedItems);
  Object.values(sources.teacherPlan || {}).forEach(addAttributedItems);
  return [...participants.values()];
}
