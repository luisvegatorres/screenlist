# Screenlist

A movie watchlist built with MongoDB, Express, React, and Node.js. The watchlist and About page use a custom responsive layout.

## Mobile client (Module 3)
The `mobile/` directory contains the React Native application. See `mobile/README.md` for native setup, architecture, and verification steps. The `production` branch contains the runnable submission; `main` contains the same delivered source for the GitHub ZIP.

Live website: https://screenlist-three.vercel.app/

React Native web preview: https://screenlist-three.vercel.app/mobile/

## Run locally
Use Node.js 22 or newer. Install dependencies with `npm install`, copy `.env.example` to `.env`, and configure `MONGODB_URI` for your MongoDB database plus a random `JWT_SECRET` of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
Run `npm ci --prefix mobile`, `npm test`, `npm run test:mobile`, `npm run build`, and `npm start`. Open http://localhost:3000.

## API
- GET /api/movies?page=1 — paginated collection (12 records per page)
- GET /api/movies/:id — one movie
- POST /api/movies — create a movie
- PATCH /api/movies/:id — update selected fields
- PUT /api/movies/:id — replace the editable fields
- DELETE /api/movies/:id — remove a movie

The editable fields are title (1–120 characters), genre (1–40), and status (Planned, Watching, or Watched). MongoDB generates the ID, and the server generates created_at and updated_at. The client cannot change timestamps.

## Deployment
Import the repository into Vercel. Use Node.js 22 or newer. Set MONGODB_URI and JWT_SECRET as server environment variables and allow the deployment server to reach the database. The build command runs tests before compiling the React interface. Static pages are served from dist; /api requests go to the Express function.

## Authentication (Module 4)
Register at `/register` or sign in at `/login`; the mobile routes are `/mobile/register` and `/mobile/sign-in`. Name, normalized unique email, and a salted scrypt password hash form the user model. Passwords must be 12–128 characters. Passport Local verifies credentials; Passport JWT protects every movie operation. Movies reference their owner, and every read/update/delete query includes the authenticated owner ID. Old unowned demonstration records remain stored but are not exposed to new accounts.

Browser sessions use an HttpOnly, SameSite=Strict cookie (Secure in production). Native clients receive a one-hour bearer token held in memory; restarting the native app requires sign-in again. Sessions are also tracked in MongoDB, so logout revokes the current session immediately. JWT validation restricts the algorithm, issuer, audience, expiration, user, and session. Expired sessions return the interface to sign-in. Web and mobile screens guard the CRUD routes, and the server independently enforces access.

POST `/api/auth/register` accepts name/email/password, POST `/api/auth/login` accepts email/password, GET `/api/auth/me` returns the public user and expiry, and POST `/api/auth/logout` revokes the session. Every modifying request needs `X-Screenlist-Client: web` or `native`; foreign browser origins are not granted CORS permission. Native requests use `Authorization: Bearer <token>`. Never put live tokens or secrets in source files. Authentication attempts have a shared MongoDB-backed limit of 30 per IP per 15-minute fixed window.

This is a course demonstration, not a complete consumer identity system. Email verification, account recovery, MFA, breached-password screening, and operational monitoring are not implemented. Use non-sensitive test accounts and passwords not reused elsewhere.

## Checks
The API tests exercise CRUD, input validation, pagination, missing routes, and safe database failures using an injected in-memory test double. Authentication tests also cover two-user isolation, missing/altered/expired tokens, logout revocation, cookie flags, CSRF headers, duplicate accounts, and safe public responses. `npm run verify:database` exercises the real MongoDB integration using temporary test accounts and cleans up only those accounts and their movies; it requires MONGODB_URI and JWT_SECRET. Before delivery, create a movie on the deployed site, reload, edit it, reload again, and delete it. Verify /about opens directly.

## Source archive
Download the ZIP from the repository's default branch. Dependencies, generated build files, and environment secrets are ignored.

