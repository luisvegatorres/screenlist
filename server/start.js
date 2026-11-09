import express from 'express';
import app from '../api/index.js';
app.use(express.static('dist'));
app.get('/about', (req, res) => res.sendFile('about.html', { root: 'dist' }));
app.use((req, res) => res.status(404).send('Page not found'));
app.listen(process.env.PORT || 3000, () => console.log('Screenlist is running'));
