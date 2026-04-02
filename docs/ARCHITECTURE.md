# PeaPod — Architecture Decisions (Deliverable 1)

This document locks the technical choices for the MVP and near-term scale path. It maps directly to the full product spec; implementation proceeds in phases (see `docs/PHASED_CHECKLIST.md`).

## 1. Frontend stack (chosen)

| Layer | Choice | Rationale |
|--------|--------|-----------|
| Framework | **Next.js** (App Router) | Server components, streaming, route handlers, and colocated API for OAuth and webhooks; industry default for production B2C. |
| Language | **TypeScript** | Shared types with DB and APIs; safer refactors as domains grow (sessions, voting, providers). |
| Styling | **Tailwind CSS** | Fast iteration, consistent design tokens, works well with component libraries. |
| Components | **shadcn/ui** (Radix) | Accessible primitives, copy-in ownership, no opaque component lock-in; pairs with Tailwind. |
| Data fetching | **Server Components + Server Actions** where mutations are same-origin | Reduces client bundle; keeps secrets off the client. |
| Client-only UI | **Client Components** | Realtime subscriptions, voting UI, queue animations. |

**Conventions:** Route groups `(marketing)`, `(auth)`, and authenticated `app/dashboard/*` keep layouts isolated. Shared UI under `components/` with domain folders (`dashboard/`, `sessions/`, etc.).

## 2. Supabase usage (exact)

| Capability | Usage |
|------------|--------|
| **Postgres** | Source of truth for profiles, normalized music graph, listening events, sessions, votes, sync jobs, chatbot logs. |
| **Auth** | Email/password (and later OAuth providers if desired); `auth.users` is the identity; `public.profiles` mirrors app profile (spec’s “users” entity). |
| **Row Level Security (RLS)** | All user-owned tables: users only see their own rows; session tables restricted by membership; **OAuth tokens never exposed to the client** (see below). |
| **Realtime** | `sessions`, `session_queue`, `session_votes`, `session_activity` (and optionally `session_members`) for live party/group UX. |
| **Storage** | Optional later (avatars, export artifacts); not required for Phase 1. |
| **Edge Functions** | Optional for provider token refresh on a schedule, Apple Music server-to-server calls, or rate-limited voting; **not mandatory for MVP** if Route Handlers + cron (Vercel/Supabase cron) suffice. |

### Token security model

- **`provider_accounts`**: Non-sensitive metadata the app can show (provider name, external id, sync timestamps, status).
- **`provider_oauth_credentials`**: `access_token` / `refresh_token` / expiry — **RLS denies all access for `authenticated` and `anon`**. Reads/writes happen only with the **service role** from **server-side** code (Route Handlers / Server Actions / Edge Functions). The browser never receives raw tokens.

This satisfies “abstract provider integrations so secrets are not exposed client-side.”

## 3. Provider integration strategy

### Abstraction

All provider-specific code lives under `lib/providers/`:

- **`MusicProvider` interface** (canonical operations): link account, refresh tokens, fetch recent plays / top items / library signals, resolve metadata, create playlist (when supported).
- **Per provider:** `spotify/`, `apple-music/` implementing the interface.
- **IDs:** Internal UUIDs for `tracks`, `artists`, `albums`. **`provider_*_mappings`** tables map external IDs → internal IDs. The app never assumes one global external ID format.

### OAuth and callbacks

- **Spotify:** Authorization Code + PKCE (or server-side code exchange with client secret on server). Callback handled by **Next.js Route Handler** (`/api/auth/spotify/callback`), which exchanges the code and persists tokens via service role.
- **Apple Music:** See `docs/APPLE_MUSIC.md` — flow differs (MusicKit JS / developer token / Music User Token); still persists a **provider account** row and maps into the same schema.

### Sync jobs

- **`sync_jobs`** records each run (type, status, errors, metadata).
- Triggers: manual “Sync now”, post-link, and scheduled jobs (later). Heavy lifting stays **idempotent** (upsert mappings and events).

## 4. Realtime strategy

| Feature | Mechanism |
|---------|-----------|
| Party / group queue | Subscribe to changes on `session_queue` filtered by `session_id` |
| Votes / leaderboard | `session_votes` + aggregated reads or materialized client state from events |
| Presence / “who’s here” | `session_members` + heartbeat or `session_activity` events |
| Anti-abuse | Server-side validation + cooldown columns / rate limits in DB or Edge Function |

**Client:** `@supabase/supabase-js` Realtime in Client Components, with channel names scoped by `session_id`. **Server:** initial queue state via Server Components or `server` Supabase client for SSR.

**Conflict handling:** Queue ordering is authoritative in Postgres; clients reconcile on Realtime `INSERT`/`UPDATE`/`DELETE`.

## 5. AI / recommendations (phased)

- **Phase 1–3:** Rules, heuristics, SQL aggregations, stored **pattern profiles** (`user_pattern_profiles`).
- **Later:** Embeddings, LLM explanations — behind new modules in `lib/recommendation/` without rewriting the schema.

## 6. Hosting and env (typical)

- **Frontend + API routes:** Vercel (or similar) with env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, Apple keys per `APPLE_MUSIC.md`.

---

**Summary:** Next.js + TS + Tailwind + shadcn for product velocity; Supabase for auth, data, RLS, and Realtime; provider logic behind a single interface; tokens only on the server; Realtime for session truth. This is scalable to a real startup product without front-loading ML.
