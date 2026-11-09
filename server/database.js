import mongoose from 'mongoose';
import { statuses } from './validation.js';
mongoose.set('bufferCommands', false);
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  genre: { type: String, required: true, trim: true, maxlength: 40 },
  status: { type: String, required: true, enum: statuses }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false });
schema.index({ created_at: -1, _id: -1 });
const Movie = mongoose.models.Movie || mongoose.model('Movie', schema);
let connecting;
async function connect() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw Object.assign(new Error('Database connection is not configured.'), { status: 503 });
  if (!connecting) connecting = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, maxPoolSize: 5 }).catch(error => { connecting = undefined; throw error; });
  await connecting;
}
export const database = {
  async list(page, limit) { await connect(); const [items, total] = await Promise.all([Movie.find().sort({ created_at: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Movie.countDocuments()]); return { items, total }; },
  async get(id) { await connect(); return Movie.findById(id).lean(); },
  async create(data) { await connect(); return (await Movie.create(data)).toObject(); },
  async update(id, data) { await connect(); return Movie.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean(); },
  async remove(id) { await connect(); return Movie.findByIdAndDelete(id).lean(); }
};
