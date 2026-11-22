import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { api } from './client';
import type { User } from './api';
import { setToken, onExpired } from './session';
type Auth = { user: User | null; loading: boolean; error: string; retry: () => void; signIn: (values: { name?: string; email: string; password: string }, register: boolean) => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<Auth | null>(null);
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('Missing account provider'); return value; }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expiry, setExpiry] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    onExpired(() => { setUser(null); setExpiry(null); });
    return () => onExpired(undefined);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    if (Platform.OS !== 'web') { setLoading(false); return; }
    api.me().then(result => { if (active) { setUser(result.user); setExpiry(result.expiresAt); } }).catch(e => {
      if (active && e.status !== 401) setError(e.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    if (!expiry) return;
    const timer = setTimeout(() => { setToken(null); setUser(null); setExpiry(null); }, Math.max(0, new Date(expiry).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [expiry]);
  const value = useMemo<Auth>(() => ({ user, loading, error, retry: () => setRevision(r => r + 1),
    signIn: async (values, register) => { const result = await api.authenticate(values, register); setToken(result.token || null); setUser(result.user); setExpiry(result.expiresAt); },
    signOut: async () => { await api.logout(); setToken(null); setUser(null); setExpiry(null); }
  }), [user, loading, error]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
