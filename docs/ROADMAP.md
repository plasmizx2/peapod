# PeaPod — 20-step phased roadmap

Ordered roughly by dependency and user impact. Adjust dates and owners as you go.

---

## Phase A — Ship what exists (steps 1–5)

Status: **implemented in app/docs** — keep running smoke tests each release.

1. **Verify production env** — `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, Spotify client IDs; no duplicate env keys. *(See `.env.example` + README Production checklist.)*
2. **Run migrations everywhere** — `npm run db:push` on staging + production after each schema change. *(Documented in README.)*
3. **Spotify re-link campaign** — users reconnect after scope changes; **dashboard banner** when `/api/spotify/connection` fails (`SpotifyLinkHint` on group session page).
4. **Smoke-test group session** — manual: create/join, search add, playlist import, playback, driving log, votes, rebalance, end/leave.
5. **Error surfacing for playback** — `friendlyPlaybackFailure` maps device/premium/401 to message + hint; API returns `{ error, hint? }`.

---

## Phase B — Group session reliability (steps 6–10)

6. **Device awareness** — list Connect devices for host; optional “transfer playback” before play (or deep link to Spotify app).
7. **Now playing / queue truth** — poll or display host `currently_playing` vs next queue row so the lobby matches reality.
8. **Duplicate & abuse guardrails** — per-user add limits, cooldowns, or caps on playlist import size (tune `MAX_IMPORT` + messaging).
9. **Shareable join** — stable URL with code or `?session=` prefill; optional short link or QR for in-car.
10. **Session lifecycle polish** — host transfer edge cases, “session ended” copy, reconnect SSE when tab sleeps.

---

## Phase C — Product depth (steps 11–15)

11. **Solo mode parity** — align dashboard stats, presets, and group session story (same “PeaPod” voice).
12. **Car / crew narrative** — one landing section or onboarding that explains: host device, same room vs remote limits.
13. **Playlist import v2** — dedupe against queue, optional “interleave” members’ playlists, show import progress for large lists.
14. **Driving log v2** — toggle “only save on play next” vs “save on vote threshold”; optional second playlist for “parking lot” rejects (later).
15. **Analytics (privacy-safe)** — aggregate session counts, drop-off, feature usage; no raw listening content in logs.

---

## Phase D — Platform & scale (steps 16–20)

16. **CI on every PR** — `npm run lint` + `npm run build`; optional Playwright smoke for auth + dashboard.
17. **Rate limits & cost** — review Spotify API usage, search limits, session SSE cadence; add Redis or similar if you multi-instance.
18. **Observability** — structured logs for API routes, Spotify failures, DB slow queries; error tracking (e.g. Sentry) optional.
19. **Security pass** — session ID exposure, CSRF for auth routes, review OAuth redirect URLs per environment.
20. **Strategic fork** — choose one to prototype next: **(a)** remote synchronized listen (Web Playback SDK + Premium), **(b)** native/share sheet, or **(c)** deeper taste/ML on existing stats.

---

## How to use this doc

- Treat **steps 1–5** as “done means we can invite beta users.”
- **6–10** are the main gap between “demo” and “trustworthy for a real car trip.”
- Revisit **20** quarterly; only one strategic fork should get serious engineering at a time.
