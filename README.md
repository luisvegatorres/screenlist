# Screenlist

A movie watchlist built with MongoDB, Express, React, and Node.js. The watchlist and About page use a custom responsive layout.

## Run locally
Use Node.js 22 or newer. Install dependencies with `npm install`, copy `.env.example` to `.env`, and configure `MONGODB_URI` for your MongoDB database.
Run `npm test`, `npm run build`, and `npm start`. Open http://localhost:3000.

## API
- GET /api/movies?page=1 — paginated collection (12 records per page)
- GET /api/movies/:id — one movie
- POST /api/movies — create a movie
- PATCH /api/movies/:id — update selected fields
- PUT /api/movies/:id — replace the editable fields
- DELETE /api/movies/:id — remove a movie

The editable fields are title (1–120 characters), genre (1–40), and status (Planned, Watching, or Watched). MongoDB generates the ID, and the server generates created_at and updated_at. The client cannot change timestamps.

## Deployment
Import the repository into Vercel. Use Node.js 22 or newer. Set MONGODB_URI as a server environment variable and allow the deployment server to reach the database. The build command runs tests before compiling the React interface. Static pages are served from dist; /api requests go to the Express function.

This version is a shared demonstration collection without user accounts. Use only non-sensitive sample movie information. User ownership and authentication are future work.

## Checks
The API tests exercise CRUD, input validation, pagination, missing routes, and safe database failures using an injected in-memory test double. They do not replace a real MongoDB integration test. Before delivery, create a movie on the deployed site, reload, edit it, reload again, and delete it. Verify /about opens directly.

## Source archive
Download the ZIP from the repository's default branch. Dependencies, generated build files, and environment secrets are ignored.
