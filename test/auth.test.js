import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { setup } from './helpers.js';
import { hashPassword, verifyPassword, issuer, audience } from '../server/auth.js';
const movie = { title: 'Private movie', genre: 'Drama', status: 'Planned' };
test('all movie operations require authentication, even direct API requests', async () => {
  const { api } = setup();
  for (const method of ['get','post','put','patch','delete']) {
    const path = ['put','patch','delete'].includes(method) ? '/api/movies/000000000000000000000001' : '/api/movies';
    await api[method](path).set('X-Screenlist-Client','native').send(method === 'get' ? undefined : movie).expect(401);
  }
});
test('registration hashes passwords with unique salts and responses contain only public user fields', async () => {
  const s = setup(); const first = await s.register(); const second = await s.register('second@example.invalid');
  const a = s.users.get(first.body.user._id), b = s.users.get(second.body.user._id);
  assert.notEqual(a.passwordHash, b.passwordHash);
  assert.ok(!a.passwordHash.includes('test-password-123!'));
  assert.equal(await verifyPassword('test-password-123!', a.passwordHash), true);
  assert.deepEqual(Object.keys(first.body.user).sort(), ['_id','email','name']);
  assert.ok(!JSON.stringify(jwt.decode(first.body.token)).includes('password'));
  await s.api.post('/api/auth/register').set('X-Screenlist-Client','native').send({name:'Reader',email:'FIRST@example.invalid',password:'test-password-123!'}).expect(409);
});
test('login accepts normalized email and rejects incorrect credentials without account disclosure', async () => {
  const s = setup(); await s.register();
  const login = (email, password) => s.api.post('/api/auth/login').set('X-Screenlist-Client','native').send({email,password});
  await login(' FIRST@EXAMPLE.INVALID ', 'test-password-123!').expect(200);
  const wrong = await login('first@example.invalid', 'wrong-password-123!').expect(401);
  const unknown = await login('unknown@example.invalid', 'wrong-password-123!').expect(401);
  assert.deepEqual(wrong.body, unknown.body);
});
test('two accounts cannot list, read, update or delete each other’s movies', async () => {
  const s = setup(); const a = s.authenticated((await s.register()).body.token); const b = s.authenticated((await s.register('second@example.invalid')).body.token);
  const item = (await a.post('/api/movies').send(movie).expect(201)).body;
  assert.equal((await b.get('/api/movies').expect(200)).body.total, 0);
  for (const method of ['get','patch','put','delete']) await b[method]('/api/movies/' + item._id).send(method === 'get' ? undefined : movie).expect(404);
  await a.get('/api/movies/' + item._id).expect(200);
  await b.post('/api/movies').send({...movie, owner:item.owner}).expect(400);
});
test('expired, altered, wrong audience, wrong algorithm, revoked and deleted-user tokens are rejected', async () => {
  const s = setup(); const token = (await s.register()).body.token; const claims = jwt.decode(token);
  const sign = changes => jwt.sign({...claims,...changes},process.env.JWT_SECRET);
  for (const invalid of [sign({exp:1}),sign({aud:'another-app'}),sign({iss:'another-issuer'}),jwt.sign({sub:claims.sub,jti:claims.jti},process.env.JWT_SECRET,{algorithm:'HS384'}),token.slice(0,-4)+'xxxx']) await s.authenticated(invalid).get('/api/movies').expect(401);
  await s.authenticated(token).post('/api/auth/logout').expect(204);
  await s.authenticated(token).get('/api/movies').expect(401);
  const again = (await s.api.post('/api/auth/login').set('X-Screenlist-Client','native').send({email:'first@example.invalid',password:'test-password-123!'}).expect(200)).body.token;
  s.users.delete(claims.sub); await s.authenticated(again).get('/api/movies').expect(401);
});
test('web sessions use an HttpOnly SameSite cookie and reject cross-site form writes', async () => {
  const s = setup(); const agent = request.agent(s.app);
  const result = await agent.post('/api/auth/register').set('X-Screenlist-Client','web').send({name:'Browser Reader',email:'browser@example.invalid',password:'test-password-123!'}).expect(201);
  assert.equal(result.body.token, undefined);
  assert.match(result.headers['set-cookie'][0], /HttpOnly/); assert.match(result.headers['set-cookie'][0], /SameSite=Strict/);
  await agent.get('/api/auth/me').expect(200);
  await agent.post('/api/movies').send(movie).expect(403);
  await agent.post('/api/movies').set('X-Screenlist-Client','web').send(movie).expect(201);
  await agent.post('/api/auth/logout').set('X-Screenlist-Client','web').expect(204);
  await agent.get('/api/movies').expect(401);
});
test('invalid account input, credential objects and attempt limits are handled', async () => {
  const s = setup();
  for (const body of [{}, {name:'Reader',email:{$ne:null},password:'test-password-123!'}, {name:'Reader',email:'bad',password:'test-password-123!'}, {name:'Reader',email:'a@example.invalid',password:'short'}, {name:'Reader',email:'a@example.invalid',password:'test-password-123!',admin:true}]) await s.api.post('/api/auth/register').set('X-Screenlist-Client','native').send(body).expect(400);
  s.db.authAttempt = async () => false;
  await s.api.post('/api/auth/login').set('X-Screenlist-Client','native').send({email:'a@example.invalid',password:'test-password-123!'}).expect(429).expect('Retry-After','900');
});
test('corrupt password hashes fail closed', async () => { assert.equal(await verifyPassword('example-password','not-a-hash'),false); });
