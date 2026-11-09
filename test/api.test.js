import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server/app.js';
function setup() {
  const entries = new Map(); let number = 0;
  const database = {
    async list(page, limit) { return { items: [...entries.values()].slice((page - 1) * limit, page * limit), total: entries.size }; },
    async get(id) { return entries.get(id); },
    async create(data) { const movie = { ...data, _id: (++number).toString(16).padStart(24, '0'), created_at: new Date().toISOString() }; entries.set(movie._id, movie); return movie; },
    async update(id, data) { if (!entries.has(id)) return null; const movie = { ...entries.get(id), ...data }; entries.set(id, movie); return movie; },
    async remove(id) { const movie = entries.get(id); entries.delete(id); return movie; }
  };
  return request(createApp(database));
}
test('create, read, patch, replace, and delete a movie', async () => {
  const api = setup();
  const created = await api.post('/api/movies').send({ title: ' Arrival ', genre: 'Science fiction', status: 'Planned' }).expect(201);
  const movie = created.body;
  assert.equal(movie.title, 'Arrival'); assert.ok(movie.created_at);
  await api.get('/api/movies/' + movie._id).expect(200);
  const updated = await api.patch('/api/movies/' + movie._id).send({ status: 'Watched' }).expect(200);
  assert.equal(updated.body.status, 'Watched'); assert.equal(updated.body.created_at, movie.created_at);
  await api.put('/api/movies/' + movie._id).send({ title: 'Arrival', genre: 'Drama', status: 'Watched' }).expect(200);
  const list = await api.get('/api/movies').expect(200);
  assert.equal(list.body.total, 1); assert.equal(list.body.items[0].genre, 'Drama');
  await api.delete('/api/movies/' + movie._id).expect(204);
  await api.get('/api/movies/' + movie._id).expect(404);
});
test('reject invalid data, client timestamps, malformed IDs, and invalid pagination', async () => {
  const api = setup();
  for (const body of [{}, { title: ' ', genre: 'Drama', status: 'Planned' }, { title: 'Film', genre: 'Drama', status: 'Unknown' }, { title: 'Film', genre: 'Drama', status: 'Planned', created_at: 'fake' }]) await api.post('/api/movies').send(body).expect(400);
  await api.get('/api/movies/bad-id').expect(400);
  await api.get('/api/movies?page=0').expect(400);
  await api.get('/api/movies?page=1.2').expect(400);
  await api.get('/api/missing').expect(404).expect('Content-Type', /json/);
});
test('bound collection reads and expose the next page', async () => {
  const api = setup();
  for (let i = 0; i < 13; i++) await api.post('/api/movies').send({ title: 'Movie ' + i, genre: 'Drama', status: 'Planned' });
  const first = await api.get('/api/movies').expect(200);
  assert.equal(first.body.items.length, 12); assert.equal(first.body.hasMore, true);
  const last = await api.get('/api/movies?page=2').expect(200);
  assert.equal(last.body.items.length, 1); assert.equal(last.body.hasMore, false);
});
test('return a safe error when the database fails', async () => {
  const api = request(createApp({ list: async () => { throw new Error('private connection details'); } }));
  const response = await api.get('/api/movies').expect(503);
  assert.ok(!response.text.includes('private'));
});
