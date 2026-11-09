import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('dist/about', { recursive: true });
await build({ entryPoints: ['client/main.jsx'], bundle: true, minify: true, sourcemap: false, outdir: 'dist/assets', define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.js': 'jsx' } });
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Keep your next movie night in one place."><title>Screenlist — Your next movie night</title><link rel="stylesheet" href="/assets/main.css"></head><body><div id="root"></div><script type="module" src="/assets/main.js"></script></body></html>';
await writeFile('dist/index.html', html);
await writeFile('dist/about/index.html', html);
await writeFile('dist/about.html', html);
