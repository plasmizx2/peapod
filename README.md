# PeaPod

Social music intelligence: personal patterns, group sessions, party voting — built in phases.

## Stack

- **Next.js** (App Router) · **TypeScript** · **Tailwind CSS**
- **Auth.js** (NextAuth v5) — email/password sessions (JWT)
- **Drizzle ORM** + **postgres** driver → **Render Postgres** (or any Postgres)
- Provider abstraction for **Spotify** and **Apple Music** (see `docs/`)

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture notes (some sections still mention Supabase — update as you go) |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Target folder layout |
| [docs/PHASED_CHECKLIST.md](docs/PHASED_CHECKLIST.md) | Phase gates and build order |
| [docs/APPLE_MUSIC.md](docs/APPLE_MUSIC.md) | Apple vs Spotify integration notes |

## Setup

1. Copy `.env.example` to `.env.local` and set **`DATABASE_URL`** (Render **External** URL for local dev), **`AUTH_SECRET`** (`openssl rand -base64 32`), **`AUTH_URL`**, **`NEXT_PUBLIC_SITE_URL`**, and Spotify keys. In [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add redirect URI `http://localhost:3000/api/auth/spotify/callback` (and your production URL for Render).

2. Create tables: either run SQL **`drizzle/0000_init_auth_providers.sql`** in Render’s SQL shell / `psql`, or with env loaded run **`npm run db:push`** (Drizzle syncs `src/db/schema.ts`).

3. Install and run:

```bash
npm install
npm run dev
```

4. **shadcn/ui** — run `npx shadcn@latest init` when you want shared UI primitives.

## Scripts

- `npm run dev` — Next.js with Turbopack
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run db:push` — push Drizzle schema to `DATABASE_URL`
- `npm run db:studio` — Drizzle Studio (optional)

## Repo notes

- npm package name is `peapod` (lowercase); the product name is PeaPod.
- Spotify tokens are stored in **`provider_oauth_credentials`** on the server only (not exposed to the browser).
