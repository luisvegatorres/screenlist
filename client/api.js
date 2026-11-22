export async function request(path, options = {}) {
  const response = await fetch('/api' + path, { ...options, headers: { 'Content-Type': 'application/json', 'X-Screenlist-Client': 'web', ...options.headers } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({ error: 'Unexpected response. Please try again.' }));
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/register', '/auth/me'].includes(path)) window.dispatchEvent(new Event('screenlist:expired'));
    throw Object.assign(new Error(data.error || 'Request failed.'), { status: response.status });
  }
  return data;
}

