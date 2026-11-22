import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { database } from '../server/database.js';
if (!process.env.MONGODB_URI) throw new Error('Database verification needs MONGODB_URI.');
// This isolated test app can use an ephemeral signing key; deployment still requires JWT_SECRET.
process.env.JWT_SECRET ||= randomBytes(48).toString('hex');
const marker = 'verification-' + randomBytes(12).toString('hex');
const emails = [marker + '-a@example.invalid', marker + '-b@example.invalid'];
const password = randomBytes(24).toString('hex');
const api = request(createApp(database));
const authed = (method, path, token) => api[method](path).set('X-Screenlist-Client','native').set('Authorization', 'Bearer ' + token);
try {
  await api.get('/api/movies').expect(401);
  const tokens = [];
  for (const email of emails) {
    const result = await api.post('/api/auth/register').set('X-Screenlist-Client','native').send({name:marker,email,password}).expect(201);
    tokens.push(result.body.token); assert.equal(result.body.user.passwordHash, undefined);
  }
  const [a,b] = tokens;
  const item = (await authed('post','/api/movies',a).send({title:marker,genre:'Test',status:'Planned'}).expect(201)).body;
  assert.equal((await authed('get','/api/movies',a).expect(200)).body.total, 1);
  assert.equal((await authed('get','/api/movies',b).expect(200)).body.total, 0);
  const path = '/api/movies/' + item._id;
  for (const method of ['get','patch','put','delete']) await authed(method,path,b).send(method==='get'?undefined:{title:'Forbidden',genre:'Test',status:'Watched'}).expect(404);
  await authed('patch',path,a).send({status:'Watched'}).expect(200);
  assert.equal((await authed('get',path,a).expect(200)).body.status,'Watched');
  await authed('put',path,a).send({title:marker,genre:'Verified',status:'Watching'}).expect(200);
  await authed('delete',path,a).expect(204);
  await authed('get',path,a).expect(404);
  await authed('post','/api/auth/logout',a).expect(204);
  await authed('get','/api/movies',a).expect(401);
  await api.post('/api/auth/login').set('X-Screenlist-Client','native').send({email:emails[0],password}).expect(200);
  console.log('MongoDB integration passed: registration, login, owner isolation, full CRUD, and logout revocation.');
} finally {
  // Cleanup is limited to accounts created by this invocation and their records.
  if (mongoose.connection.readyState === 1) {
    const users = await mongoose.model('User').find({email:{$in:emails},name:marker}).select('_id').lean();
    const ownedIds = users.map(u=>u._id);
    await mongoose.model('Movie').deleteMany({owner:{$in:ownedIds}});
    await mongoose.model('Session').deleteMany({user:{$in:ownedIds}});
    await mongoose.model('User').deleteMany({_id:{$in:ownedIds},name:marker});
    console.log('Temporary verification accounts and records removed.');
    await mongoose.disconnect();
  }
}
