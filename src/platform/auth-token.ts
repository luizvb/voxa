import { authClient } from '../lib/auth';

const SESSION_RETRY_DELAYS_MS = [300, 900];

export function isTransientSessionError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message || error || '').toLowerCase();
  return [
    'timeout',
    'timed out',
    'connection terminated',
    'network',
    'fetch failed',
    'failed to fetch',
    'internal server error',
    'status 500',
    'status 502',
    'status 503',
    'status 504',
  ].some((fragment) => message.includes(fragment));
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function getAuthToken(): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= SESSION_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const result = await authClient.getSession();
      const token = result.data?.session?.token;
      if (token) return token;
      if (result.error) throw result.error;
      throw new Error('Your session has expired. Please sign in again.');
    } catch (error) {
      lastError = error;
      const delay = SESSION_RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isTransientSessionError(error)) break;
      await wait(delay);
    }
  }
  if (isTransientSessionError(lastError)) {
    throw new Error('Voxa could not confirm your session. Your audio remains protected locally; retry when the connection recovers.');
  }
  throw lastError instanceof Error ? lastError : new Error('Your session has expired. Please sign in again.');
}

export function getTokenSubject(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.sub === 'string' && payload.sub) return payload.sub;
  } catch { /* The server remains the authority for token validation. */ }
  throw new Error('The authenticated session has no user identifier.');
}

export async function getAuthCredentials() {
  const authToken = await getAuthToken();
  return { authToken, userId: getTokenSubject(authToken) };
}
