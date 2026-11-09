export async function request(path, options = {}) {
  const response = await fetch('/api' + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({ error: 'Unexpected response. Please try again.' }));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
