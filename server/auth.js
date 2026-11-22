import { Passport } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const cookieName = 'screenlist_session';
export const issuer = 'screenlist-api';
export const audience = 'screenlist-client';
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export function validateCredentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('Enter your email and password.');
  const allowed = registration ? ['name', 'email', 'password'] : ['email', 'password'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw fail('Unexpected account field.');
  if (typeof body.email !== 'string' || body.email.length > 254 || !/^\S+@\S+\.\S+$/.test(body.email.trim())) throw fail('Enter a valid email address.');
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) throw fail('Use a password between 12 and 128 characters.');
  if (registration && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80)) throw fail('Enter a name between 1 and 80 characters.');
  return { email: body.email.trim().toLowerCase(), password: body.password, ...(registration ? { name: body.name.trim() } : {}) };
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [algorithm, salt, hex] = String(stored).split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hex)) return false;
  const actual = await scrypt(password, salt, 64, options);
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
export function publicUser(user) { return { _id: String(user._id), name: user.name, email: user.email }; }
function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw fail('Authentication is not configured. Please try again later.', 503);
  return process.env.JWT_SECRET;
}
function cookie(req) {
  const value = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='));
  return value ? value.slice(cookieName.length + 1) : null;
}
export function configureAuth(app, database) {
  const passport = new Passport();
  passport.use(new LocalStrategy({ usernameField: 'email', session: false }, async (email, password, done) => {
    try {
      const user = await database.userByEmail(email.trim().toLowerCase());
      // Perform the same expensive hash even for an unknown account.
      const stored = user?.passwordHash || `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
      const valid = await verifyPassword(password, stored);
      done(null, valid && user ? user : false);
    } catch (error) { done(error); }
  }));
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), cookie]),
    secretOrKeyProvider: (req, token, done) => { try { done(null, secret()); } catch (error) { done(error); } },
    issuer, audience, algorithms: ['HS256']
  }, async (payload, done) => {
    try {
      if (!/^[a-f0-9]{24}$/.test(payload.sub) || typeof payload.jti !== 'string') return done(null, false);
      if (!await database.activeSession(payload.jti, payload.sub)) return done(null, false);
      const user = await database.userById(payload.sub);
      done(null, user ? { ...publicUser(user), sessionId: payload.jti, expiresAt: new Date(payload.exp * 1000).toISOString() } : false);
    } catch (error) { done(error); }
  }));
  app.use(passport.initialize());
  // A custom header prevents cross-site form submissions. No cross-origin CORS
  // permission is granted, so a foreign browser cannot pass this preflight.
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !['web', 'native'].includes(req.get('X-Screenlist-Client'))) return res.status(403).json({ error: 'Use the Screenlist application to make this request.' });
    next();
  });
  const protectedRoute = (req, res, next) => passport.authenticate('jwt', { session: false }, (error, user) => {
    if (error) return next(error);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    req.user = user; next();
  })(req, res, next);
  const attempt = async (req, res, next) => {
    secret();
    const ip = process.env.VERCEL ? (req.get('x-forwarded-for') || '').split(',')[0].trim() : req.ip;
    const key = createHash('sha256').update(ip || 'unknown').digest('hex');
    if (!await database.authAttempt(key)) { res.set('Retry-After', '900'); return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }); }
    next();
  };
  const issueSession = async (req, res, user, status) => {
    const signingKey = secret();
    const jti = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000);
    await database.createSession({ _id: jti, user: String(user._id), expiresAt });
    const token = jwt.sign({}, signingKey, { algorithm: 'HS256', subject: String(user._id), jwtid: jti, issuer, audience, expiresIn: '1h' });
    const result = { user: publicUser(user), expiresAt: expiresAt.toISOString() };
    if (req.get('X-Screenlist-Client') === 'native') result.token = token;
    else res.cookie(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api', maxAge: 3600000 });
    res.status(status).json(result);
  };
  app.post('/api/auth/register', attempt, async (req, res) => {
    const values = validateCredentials(req.body, true);
    const passwordHash = await hashPassword(values.password);
    try {
      const user = await database.createUser({ name: values.name, email: values.email, passwordHash });
      await issueSession(req, res, user, 201);
    } catch (error) {
      if (error.code === 11000) throw fail('Unable to create that account. Try signing in or use another email.', 409);
      throw error;
    }
  });
  app.post('/api/auth/login', attempt, (req, res, next) => {
    validateCredentials(req.body);
    passport.authenticate('local', { session: false }, (error, user) => {
      if (error) return next(error);
      if (!user) return res.status(401).json({ error: 'Email or password is incorrect.' });
      issueSession(req, res, user, 200).catch(next);
    })(req, res, next);
  });
  app.get('/api/auth/me', protectedRoute, (req, res) => res.json({ user: publicUser(req.user), expiresAt: req.user.expiresAt }));
  app.post('/api/auth/logout', protectedRoute, async (req, res) => {
    await database.deleteSession(req.user.sessionId, req.user._id);
    res.clearCookie(cookieName, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api' });
    res.status(204).end();
  });
  return protectedRoute;
}
