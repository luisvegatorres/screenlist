import request from 'supertest';
import { createApp } from '../server/app.js';
process.env.JWT_SECRET = 'test-only-signing-key-never-use-in-production';
export function setup() {
  const entries = new Map(), users = new Map(), sessions = new Map(); let number = 0;
  const id = () => (++number).toString(16).padStart(24, '0');
  const db = {
    async userByEmail(email) { return [...users.values()].find(u => u.email === email); },
    async userById(id) { return users.get(id); },
    async createUser(data) { if (await this.userByEmail(data.email)) throw Object.assign(new Error('duplicate'), { code: 11000 }); const user = { ...data, _id: id() }; users.set(user._id, user); return user; },
    async createSession(data) { sessions.set(data._id, data); },
    async activeSession(id, user) { const s = sessions.get(id); return s?.user === user && s.expiresAt > new Date(); },
    async deleteSession(id) { sessions.delete(id); },
    async authAttempt() { return true; },
    async list(page, limit, owner) { const mine = [...entries.values()].filter(e => e.owner === owner); return { items: mine.slice((page - 1) * limit, page * limit), total: mine.length }; },
    async get(id, owner) { const e = entries.get(id); return e?.owner === owner ? e : null; },
    async create(data) { const movie = { ...data, _id: id(), created_at: new Date().toISOString() }; entries.set(movie._id, movie); return movie; },
    async update(id, data, owner) { if (!await this.get(id, owner)) return null; const movie = { ...entries.get(id), ...data }; entries.set(id, movie); return movie; },
    async remove(id, owner) { const movie = await this.get(id, owner); if (movie) entries.delete(id); return movie; }
  };
  const app = createApp(db), api = request(app);
  const register = async (email = 'first@example.invalid', client = 'native') => (await api.post('/api/auth/register').set('X-Screenlist-Client', client).send({ name: 'Test Reader', email, password: 'test-password-123!' }).expect(201));
  const authenticated = token => Object.fromEntries(['get','post','patch','put','delete'].map(method => [method, path => api[method](path).set('X-Screenlist-Client', 'native').set('Authorization', 'Bearer ' + token)]));
  return { api, app, db, users, sessions, register, authenticated };
}
