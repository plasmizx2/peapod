# PeaPod

Social music intelligence: personal patterns, group sessions, party voting — built in phases.

## Stack

- **Next.js** (App Router) · **TypeScript** · **Tailwind CSS**
- **Supabase** (Postgres, Auth, Realtime)
- Provider abstraction for **Spotify** and **Apple Music** (see `docs/`)

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, Supabase, providers, realtime |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Target folder layout |
| [docs/PHASED_CHECKLIST.md](docs/PHASED_CHECKLIST.md) | Phase gates and build order |
| [docs/APPLE_MUSIC.md](docs/APPLE_MUSIC.md) | Apple vs Spotify integration notes |

## Setup

1. Copy `.env.example` to `.env.local` and fill in values from your Supabase project and [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Add redirect URI: `http://localhost:3000/api/auth/spotify/callback` (and production URL when deployed).

2. Apply migrations (Supabase CLI or SQL Editor): `supabase/migrations/20260402000000_initial_schema.sql`

3. Install and run:

```bash
npm install
npm run dev
```

4. **shadcn/ui** — run `npx shadcn@latest init` when you are ready for shared UI primitives (recommended before heavy UI work).

## Scripts

- `npm run dev` — Next.js with Turbopack
- `npm run build` — production build
- `npm run lint` — ESLint

## Repo notes

- npm package name is `peapod` (lowercase); the product name is PeaPod.
- OAuth tokens for providers live in `provider_oauth_credentials` and are only written/read with the **service role** on the server.
