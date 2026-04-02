# PeaPod — Phased Implementation Checklist (Deliverable 4)

Use this as the **approval gate** between phases. Do not start Phase N+1 until Phase N “Done” is true.

## Phase 1 — Foundation

- [ ] Next.js App Router + TS + Tailwind + shadcn installed
- [ ] Supabase project created; env vars in Vercel/local
- [ ] `profiles` + auth trigger; RLS on profile
- [ ] App shell: marketing page, auth pages, dashboard layout (sidebar or top nav)
- [ ] User settings + linked accounts pages (UI + load from DB)
- [ ] Spotify OAuth: start URL + callback; `provider_accounts` + `provider_oauth_credentials` write (server-only)
- [ ] Apple Music: account linking **structure** (UI + DB row; token path documented)
- **Done when:** User can sign up, sign in, connect Spotify, see shell and linked provider row

## Phase 2 — Listening data ingestion

- [ ] Normalized `artists`, `albums`, `tracks`, mappings
- [ ] `listening_events` ingestion from Spotify (and Apple where available)
- [ ] `sync_jobs` + error handling + manual “Sync”
- **Done when:** Data appears in DB after sync; logs visible

## Phase 3 — Personal music intelligence

- [ ] Aggregations → `user_pattern_profiles`, `user_track_stats`, `user_artist_stats`
- [ ] Dashboard cards: top artists/tracks, time-of-day hints, phase/vibe copy
- **Done when:** Dashboard shows real summaries from stored data

## Phase 4 — Smart solo playlists

- [ ] Scoring pipeline (solo scorer) + `generated_playlists` / `generated_playlist_tracks`
- [ ] Preset intents: late night, gym, focus, nostalgic, etc.
- **Done when:** User gets ranked playlist for at least 3 presets

## Phase 5 — Mood chatbot MVP

- [ ] `chatbot_requests` logging
- [ ] Intent → pattern cluster mapping (heuristics first)
- [ ] Response: short explanation + playlist + optional “lift / stay / shift”
- **Done when:** Free-text prompt produces a playlist grounded in user data

## Phase 6 — Group session system

- [ ] `sessions` + `session_members`; join by code; Realtime optional in lobby
- **Done when:** 2 users in same session record

## Phase 7 — Group intelligence

- [ ] Equal Play, Lean Toward Driver, Most Hype Wins — queue builder uses group scorer
- [ ] Overlap/fairness/energy rules
- **Done when:** Queue feels intentional in user testing

## Phase 8 — Party voting mode

- [ ] Suggest, vote, reorder, host controls, cooldown / anti-spam
- [ ] Realtime on queue + votes
- [ ] AI filler when quiet (uses solo/group heuristics)
- **Done when:** Live party test passes end-to-end

## Phase 9 — Recaps + social layer

- [ ] Session recap page; weekly recap (personal)
- [ ] Shareable artifacts (optional)
- **Done when:** Users can revisit a session summary

---

## Build order (from spec — engineering sequence)

1. Skeleton + Supabase + auth + layout  
2. Migrations + RLS  
3. Provider linking structure  
4. Spotify connection first  
5. Apple Music connection path  
6. Listening sync + normalized tables  
7. Dashboard insights  
8. Solo recommendation engine  
9. Mood chatbot MVP  
10. Group session system  
11. Equal Play  
12. Lean Toward Driver  
13. Party Mode (Most Hype Wins)  
14. Party voting mode  
15. Recaps + polish  

Cross-cutting: security review (RLS, tokens, rate limits) before any public beta.
