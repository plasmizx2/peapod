# PeaPod

Social music intelligence: personal patterns, group sessions, party voting — built in phases.

## Stack

- **Next.js** (App Router) · **TypeScript** · **Tailwind CSS**
- **Auth.js** (NextAuth v5) — email/password + **Google** / **GitHub** OAuth (JWT)
- **Drizzle ORM** + **postgres** driver → **Render Postgres** (or any Postgres)
- Provider abstraction for **Spotify** and **Apple Music** (see `docs/`)

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture notes (some sections still mention Supabase — update as you go) |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Target folder layout |
| [docs/PHASED_CHECKLIST.md](docs/PHASED_CHECKLIST.md) | Phase gates and build order |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 20-step product / engineering roadmap |
| [docs/GOOGLE_OAUTH.md](docs/GOOGLE_OAUTH.md) | Google sign-in: Cloud Console + redirect URIs |
| [docs/APPLE_MUSIC.md](docs/APPLE_MUSIC.md) | Apple vs Spotify integration notes |

## Setup

1. Copy `.env.example` to `.env.local` and set **`DATABASE_URL`**, **`AUTH_SECRET`**, **`AUTH_URL`**, **`NEXT_PUBLIC_SITE_URL`**. For **Google / GitHub login**, add **`AUTH_GOOGLE_ID`** / **`AUTH_GOOGLE_SECRET`** and/or **`AUTH_GITHUB_ID`** / **`AUTH_GITHUB_SECRET`**, and register these redirect URLs in each provider’s console:  
   - Google: `http://localhost:3000/api/auth/callback/google` (plus your production URL)  
   - GitHub: `http://localhost:3000/api/auth/callback/github`  
   For **Spotify (music linking)**, use [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) — redirect `http://localhost:3000/api/auth/spotify/callback`.

2. Create / update tables: run **`npm run db:push`**, or apply SQL **`drizzle/0000_init_auth_providers.sql`** then **`drizzle/0001_oauth_nullable_password.sql`** if you created the DB before OAuth (makes `password_hash` nullable).

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

## Production checklist

1. Set **`DATABASE_URL`**, **`AUTH_SECRET`**, **`AUTH_URL`**, **`NEXT_PUBLIC_SITE_URL`** on the host (same public origin, no duplicate keys).
2. In the [Spotify Dashboard](https://developer.spotify.com/dashboard), add redirect URI: `https://<your-domain>/api/auth/spotify/callback` (and localhost for dev).
3. Run **`npm run db:push`** against production DB after each deploy that changes `src/db/schema.ts`.
4. Users must **reconnect Spotify** in Music services after OAuth scopes change.

See **[docs/ROADMAP.md](docs/ROADMAP.md)** Phase A for the full gate list.

## Repo notes

- npm package name is `peapod` (lowercase); the product name is PeaPod.
- Spotify tokens are stored in **`provider_oauth_credentials`** on the server only (not exposed to the browser).
