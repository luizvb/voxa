import type { PendingRecording, SaveRecordingInput } from '../platform/types';

const DATABASE_NAME = 'voxa-recording-recovery';
const DATABASE_VERSION = 1;
const STORE_NAME = 'pending-recordings';

export const MAX_RECORDING_FILE_BYTES = 1024 * 1024 * 1024;
export const RECORDING_RECOVERY_CHANGED_EVENT = 'recording-recovery:changed';
let persistentStorageRequested = false;

function requestPersistentStorage(): void {
  if (persistentStorageRequested || !navigator.storage?.persist) return;
  persistentStorageRequested = true;
  void navigator.storage.persist().catch(() => {
    // IndexedDB remains available even when the browser declines persistent storage.
  });
}

function requireIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('Local recording recovery is unavailable in this browser.');
  }
  return indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = requireIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local recording recovery.'));
    request.onblocked = () => reject(new Error('Local recording recovery is blocked by another Voxa tab.'));
  });
}

async function useStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let settled = false;
    let hasResult = false;
    let result: T;
    const finish = (value: T) => {
      if (settled) return;
      hasResult = true;
      result = value;
    };
    const fail = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(reason || transaction.error || new Error('Local recording recovery failed.'));
    };
    transaction.onabort = () => fail(transaction.error);
    transaction.onerror = () => fail(transaction.error);
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      database.close();
      if (hasResult) resolve(result);
      else reject(new Error('Local recording recovery completed without a result.'));
    };
    try {
      action(store, finish, fail);
    } catch (error) {
      transaction.abort();
      fail(error);
    }
  });
}

function notifyRecoveryChanged(detail?: { id?: string; phase?: PendingRecording['state'] | 'removed' }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECORDING_RECOVERY_CHANGED_EVENT, { detail }));
  }
}

export function blobFromRecordingInput(input: SaveRecordingInput): Blob {
  return new Blob([input.bytes], { type: input.mimeType || 'audio/webm' });
}

export async function persistRecordingDraft(input: SaveRecordingInput): Promise<PendingRecording> {
  if (!input.id) throw new Error('A stable recording ID is required for local recovery.');
  return persistRecordingBlobDraft(input, blobFromRecordingInput(input));
}

export async function persistRecordingBlobDraft(
  input: Omit<SaveRecordingInput, 'bytes'>,
  candidateBlob: Blob,
): Promise<PendingRecording> {
  if (!input.id) throw new Error('A stable recording ID is required for local recovery.');
  const existing = await getRecordingDraft(input.id);
  const blob = existing?.blob?.size ? existing.blob : candidateBlob;
  if (!blob.size) throw new Error('The recording is empty and cannot be protected locally.');
  const now = new Date().toISOString();
  const draft: PendingRecording = {
    id: input.id,
    name: input.name,
    durationMs: input.durationMs,
    mode: input.mode,
    mimeType: input.mimeType || blob.type || 'audio/webm',
    extension: input.extension || 'webm',
    sizeBytes: blob.size,
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
    state: existing?.blobUrl ? 'finalizing' : 'protected',
    blob,
    blobUrl: existing?.blobUrl,
    lastError: undefined,
  };
  await putRecordingDraft(draft);
  return draft;
}

export async function putRecordingDraft(draft: PendingRecording): Promise<PendingRecording> {
  const next = { ...draft, updatedAt: new Date().toISOString() };
  await useStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(next);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error);
  });
  requestPersistentStorage();
  notifyRecoveryChanged({ id: next.id, phase: next.state });
  return next;
}

export async function getRecordingDraft(id: string): Promise<PendingRecording | null> {
  return useStore<PendingRecording | null>('readonly', (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as PendingRecording | undefined) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function listRecordingDrafts(): Promise<PendingRecording[]> {
  const drafts = await useStore<PendingRecording[]>('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as PendingRecording[]) || []);
    request.onerror = () => reject(request.error);
  });
  return drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateRecordingDraft(
  id: string,
  patch: Partial<Pick<PendingRecording, 'blobUrl' | 'lastError' | 'state'>>,
): Promise<PendingRecording> {
  const draft = await getRecordingDraft(id);
  if (!draft) throw new Error('The protected local recording is no longer available.');
  return putRecordingDraft({ ...draft, ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteRecordingDraft(id: string): Promise<void> {
  await useStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error);
  });
  notifyRecoveryChanged({ id, phase: 'removed' });
}

export function subscribeToRecordingRecovery(callback: () => void): () => void {
  window.addEventListener(RECORDING_RECOVERY_CHANGED_EVENT, callback);
  return () => window.removeEventListener(RECORDING_RECOVERY_CHANGED_EVENT, callback);
}

export function downloadRecordingDraft(draft: PendingRecording): void {
  const url = URL.createObjectURL(draft.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeRecordingFileName(draft.name)}.${draft.extension || 'webm'}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeRecordingFileName(value: string): string {
  const withoutUnsafe = Array.from(String(value || 'recording'))
    .map((character) => '/\\:*?"<>|'.includes(character) ? '-' : character)
    .join('');
  return withoutUnsafe.replace(/\s+/g, ' ').trim().slice(0, 120) || 'recording';
}

export function isSupportedRecordingFile(file: Pick<File, 'name' | 'type' | 'size'>): boolean {
  const mimeType = String(file.type || '').toLowerCase();
  return file.size > 0
    && file.size <= MAX_RECORDING_FILE_BYTES
    && (mimeType === 'audio/webm' || mimeType === 'video/webm' || (!mimeType && file.name.toLowerCase().endsWith('.webm')));
}

export async function readRecordingDurationMs(file: Blob): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const audio = document.createElement('audio');
      let settled = false;
      const finish = (durationSeconds: number) => {
        if (settled) return;
        settled = true;
        audio.removeAttribute('src');
        audio.load();
        if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
          resolve(Math.round(durationSeconds * 1000));
        } else {
          reject(new Error('Voxa could not read the duration of this WebM audio.'));
        }
      };
      const timeout = window.setTimeout(() => {
        finish(audio.duration);
      }, 8000);
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          window.clearTimeout(timeout);
          finish(audio.duration);
          return;
        }
        audio.ontimeupdate = () => {
          window.clearTimeout(timeout);
          finish(audio.duration || audio.currentTime);
        };
        audio.currentTime = Number.MAX_SAFE_INTEGER;
      };
      audio.onerror = () => {
        window.clearTimeout(timeout);
        finish(Number.NaN);
      };
      audio.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
