import React, { createContext, useContext, useEffect, useState } from 'react';
import { request } from './api.js';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    request('/auth/me', { signal: controller.signal }).then(data => setUser(data.user)).catch(e => {
      if (e.name !== 'AbortError' && e.status !== 401) setError(e.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const expired = () => { setUser(null); setError(''); window.history.replaceState({}, '', '/login'); };
    window.addEventListener('screenlist:expired', expired);
    return () => window.removeEventListener('screenlist:expired', expired);
  }, []);
  async function signOut() {
    await request('/auth/logout', { method: 'POST' });
    setUser(null); window.history.replaceState({}, '', '/login');
  }
  return <AuthContext.Provider value={{ user, setUser, loading, error, retry: () => setRevision(r => r + 1), signOut }}>{children}</AuthContext.Provider>;
}
export function AccountScreen() {
  const { setUser } = useAuth();
  const [register, setRegister] = useState(window.location.pathname === '/register');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try {
      const result = await request(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(values) });
      window.history.replaceState({}, '', '/'); setUser(result.user);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function toggle() { const next = !register; setRegister(next); setError(''); window.history.replaceState({}, '', next ? '/register' : '/login'); }
  return <section className="account"><span className="eyebrow">GOOD FILMS. YOUR OWN LIST.</span><h1>{register ? 'Make yourself at home.' : 'Welcome back.'}</h1><p>{register ? 'Create an account to keep your next movie night close.' : 'Sign in to your private watchlist.'}</p><form onSubmit={submit} key={String(register)}>{register && <label>Your name<input name="name" autoComplete="name" required maxLength={80} disabled={busy}/></label>}<label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy}/></label><label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={12} maxLength={128} disabled={busy}/></label><p className="account-hint">Use 12–128 characters. Your password is never displayed or stored as plain text.</p>{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account ↗' : 'Sign in ↗'}</button></form><button className="text-button account-switch" disabled={busy} onClick={toggle}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button></section>;
}
export function ProtectedWatchlist({ children }) {
  const { user, loading, error, retry, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => {
    if (!loading && !user && !error && !['/login', '/register'].includes(window.location.pathname)) window.history.replaceState({}, '', '/login');
  }, [loading, user, error]);
  if (loading) return <p className="loading" role="status">Checking your session…</p>;
  if (error) return <section className="error-panel" role="alert"><p>{error}</p><button className="secondary" onClick={retry}>Try again</button></section>;
  if (!user) return <AccountScreen/>;
  return <><div className="account-bar"><span>Welcome, {user.name}</span><button className="text-button" disabled={busy} onClick={async () => { setBusy(true); setLogoutError(''); try { await signOut(); } catch(e) { setLogoutError(e.message); } finally { setBusy(false); } }}>{busy ? 'Signing out…' : 'Sign out'}</button></div>{logoutError && <p className="error" role="alert">{logoutError}</p>}{children}</>;
}
