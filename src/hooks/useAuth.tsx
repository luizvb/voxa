import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth';

export function useAuth() {
  const { data: session, isPending: isLoading } = authClient.useSession();
  const [initialSessionReady, setInitialSessionReady] = useState(false);
  const isAuthenticated = !!session;
  const user = session?.user;

  useEffect(() => {
    if (initialSessionReady) return;
    if (!isLoading) return setInitialSessionReady(true);

    const timeout = window.setTimeout(() => setInitialSessionReady(true), 4000);
    return () => window.clearTimeout(timeout);
  }, [initialSessionReady, isLoading]);

  const loginWithRedirect = () => {
    window.dispatchEvent(new CustomEvent('auth:show-login'));
  };

  const logout = async () => {
    await authClient.signOut();
  };

  return { isAuthenticated, isLoading: !initialSessionReady, user, loginWithRedirect, logout };
}
