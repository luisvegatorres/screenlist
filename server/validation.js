export const statuses = ['Planned', 'Watching', 'Watched'];
export function validateMovie(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Provide a movie object.'), { status: 400 });
  const keys = Object.keys(body);
  if (!keys.length || keys.some(key => !['title', 'genre', 'status'].includes(key))) throw Object.assign(new Error('Only title, genre, and status may be changed.'), { status: 400 });
  const result = {};
  for (const [field, max] of [['title', 120], ['genre', 40], ['status', 20]]) {
    if (partial && !Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > max) throw Object.assign(new Error(field + ' is required and must be at most ' + max + ' characters.'), { status: 400 });
    result[field] = body[field].trim();
  }
  if (result.status && !statuses.includes(result.status)) throw Object.assign(new Error('Choose Planned, Watching, or Watched.'), { status: 400 });
  return result;
}
export function validateId(id) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw Object.assign(new Error('Invalid movie ID.'), { status: 400 });
}
export function readPage(value) {
  if (value === undefined) return 1;
  if (typeof value !== 'string' || !/^[1-9]\d{0,5}$/.test(value)) throw Object.assign(new Error('Invalid page number.'), { status: 400 });
  return Number(value);
}
