# Apple Music vs Spotify — Integration Notes (Deliverable 6)

Apple Music’s APIs and auth model **differ materially** from Spotify. The product spec’s provider abstraction is how we ship both without duplicating app logic.

## Spotify (reference)

- OAuth 2.0 Authorization Code (PKCE recommended for public clients; server-side secret for confidential web).
- REST **Web API**: clear endpoints for top tracks, recently played, playlists, user profile.
- Tokens: access + refresh stored in `provider_oauth_credentials`; refresh on expiry server-side.

## Apple Music — how it differs

| Topic | Spotify | Apple Music |
|--------|---------|--------------|
| **User identity / consent** | Standard OAuth 2.0 | **MusicKit**: user grants access to Apple Music library; often involves **MusicKit on the web** or **native** flows for best UX. |
| **Developer token** | Client ID + secret | **JWT** signed with a **private key** (.p8), **Key ID**, **Team ID**, **issuer** — short-lived; generated **server-side only**. |
| **User token** | OAuth access token | **Music User Token** (from MusicKit after user authorizes) — represents the user for catalog / library calls where allowed. |
| **APIs** | Single Web API | **Apple Music API** (catalog, recommendations) + **MusicKit** for user-specific access patterns; not identical to Spotify’s “recently played” surface in all cases. |
| **History** | Recently played endpoint | May require **different signals** (library, recommendations, or platform-specific APIs); **exact parity with Spotify “recent plays” is not guaranteed** — normalize what we can into `listening_events` and document gaps. |

## Recommended handling for PeaPod

1. **Same tables:** `provider_accounts` + `provider_oauth_credentials` (store Music User Token and expiry where applicable) + mappings for catalog IDs → internal `tracks` / `artists`.

2. **Server-only secrets:** Generate **developer tokens** only in Route Handlers / Edge Functions; never expose `.p8` or JWT signing to the client.

3. **Linking flow:**  
   - Option A: **MusicKit JS** in a small client step to obtain Music User Token → send to server over HTTPS → store encrypted or in credential table (service role only).  
   - Option B: **iOS/macOS** companion later for richer native MusicKit — still maps into the same `provider_accounts` row.

4. **Sync jobs:** Implement `AppleMusicProvider.syncRecentActivity()` with **explicit capability flags** (e.g. “full history: limited”) so the UI is honest when Apple’s data is sparser than Spotify’s.

5. **Playlist export:** Apple Music **playlist creation** may require specific endpoints and user token scopes — implement after read-only sync is stable.

## Bottom line

Treat **Spotify as the first fully wired provider** (Phase 1–2), and **Apple Music as the same interface with a different adapter + token lifecycle**. The schema already supports multiple providers; product copy should not promise identical metrics for both until parity is verified in testing.
