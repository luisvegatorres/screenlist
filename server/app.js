import express from 'express';
import { validateMovie, validateId, readPage } from './validation.js';
export function createApp(database) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/movies', async (req, res) => {
    const page = readPage(req.query.page);
    const limit = 12;
    const result = await database.list(page, limit);
    res.json({ ...result, page, pageSize: limit, hasMore: page * limit < result.total });
  });
  app.get('/api/movies/:id', async (req, res) => {
    validateId(req.params.id);
    const movie = await database.get(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json(movie);
  });
  app.post('/api/movies', async (req, res) => {
    const movie = await database.create(validateMovie(req.body));
    res.status(201).location('/api/movies/' + movie._id).json(movie);
  });
  const update = partial => async (req, res) => {
    validateId(req.params.id);
    const data = validateMovie(req.body, partial);
    const movie = await database.update(req.params.id, data);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json(movie);
  };
  app.patch('/api/movies/:id', update(true));
  app.put('/api/movies/:id', update(false));
  app.delete('/api/movies/:id', async (req, res) => {
    validateId(req.params.id);
    if (!await database.remove(req.params.id)) return res.status(404).json({ error: 'Movie not found.' });
    res.status(204).end();
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((error, req, res, next) => {
    const status = error.status || (error.name === 'ValidationError' ? 400 : 503);
    res.status(status).json({ error: status < 500 ? error.message : 'The watchlist is unavailable. Please try again shortly.' });
  });
  return app;
}
