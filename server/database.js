import mongoose from 'mongoose';
import { statuses } from './validation.js';
mongoose.set('bufferCommands', false);
// Initialize collections and indexes only after the lazy connection is ready.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  genre: { type: String, required: true, trim: true, maxlength: 40 },
  status: { type: String, required: true, enum: statuses }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false });
schema.index({ owner: 1, created_at: -1, _id: -1 });
const Movie = mongoose.models.Movie || mongoose.model('Movie', schema);
let connecting;
async function connect() {
  if (!process.env.MONGODB_URI) throw Object.assign(new Error('Database connection is not configured.'), { status: 503 });
  if (!connecting) connecting = (async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, maxPoolSize: 5 });
    await Promise.all([Movie, User, Session, Attempt].map(model => model.createIndexes()));
  })().catch(error => { connecting = undefined; throw error; });
  await connecting;
}
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, unique: true },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true, versionKey: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const sessionSchema = new mongoose.Schema({ _id: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, expiresAt: { type: Date, required: true } }, { versionKey: false });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
const attemptSchema = new mongoose.Schema({ _id: String, count: Number, expiresAt: Date }, { versionKey: false });
attemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Attempt = mongoose.models.AuthAttempt || mongoose.model('AuthAttempt', attemptSchema);
export const database = {
  async userByEmail(email) { await connect(); return User.findOne({ email }).select('+passwordHash').lean(); },
  async userById(id) { await connect(); return User.findById(id).lean(); },
  async createUser(data) { await connect(); return (await User.create(data)).toObject(); },
  async createSession(data) { await connect(); return Session.create(data); },
  async activeSession(id, user) { await connect(); return Session.exists({ _id: id, user, expiresAt: { $gt: new Date() } }); },
  async deleteSession(id, user) { await connect(); return Session.deleteOne({ _id: id, user }); },
  async authAttempt(ip) {
    await connect();
    const window = Math.floor(Date.now() / 900000);
    const record = await Attempt.findOneAndUpdate({ _id: ip + ':' + window }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * 900000) } }, { upsert: true, new: true });
    return record.count <= 30;
  },
  async list(page, limit, owner) { await connect(); const [items, total] = await Promise.all([Movie.find({ owner }).sort({ created_at: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Movie.countDocuments({ owner })]); return { items, total }; },
  async get(id, owner) { await connect(); return Movie.findOne({ _id: id, owner }).lean(); },
  async create(data) { await connect(); return (await Movie.create(data)).toObject(); },
  async update(id, data, owner) { await connect(); return Movie.findOneAndUpdate({ _id: id, owner }, { $set: data }, { new: true, runValidators: true }).lean(); },
  async remove(id, owner) { await connect(); return Movie.findOneAndDelete({ _id: id, owner }).lean(); }
};

