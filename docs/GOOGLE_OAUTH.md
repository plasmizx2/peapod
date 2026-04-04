# Google OAuth (sign in / sign up)

PeaPod already registers the Google provider in Auth.js when **`AUTH_GOOGLE_ID`** and **`AUTH_GOOGLE_SECRET`** are set. No extra code changes are required — only Google Cloud configuration and env vars.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services** → **OAuth consent screen**  
   - User type: **External** (for public testing) or **Internal** (Workspace only).  
   - Fill app name, support email, developer contact.  
   - Add scopes if prompted; **openid**, **email**, **profile** are enough for NextAuth’s Google provider.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins**  
   - `http://localhost:3000`  
   - `https://your-production-domain.com` (no trailing slash)
6. **Authorized redirect URIs** (must match exactly)  
   - `http://localhost:3000/api/auth/callback/google`  
   - `https://your-production-domain.com/api/auth/callback/google`
7. Copy **Client ID** and **Client secret**.

## 2. Environment variables

In `.env.local` (and production env):

```bash
AUTH_GOOGLE_ID=<Client ID from Google>
AUTH_GOOGLE_SECRET=<Client secret from Google>
```

Also keep **`AUTH_URL`** / **`NEXT_PUBLIC_SITE_URL`** aligned with the origin you use in the browser (see `.env.example`).

Restart `npm run dev` after changing env.

## 3. Test

1. Open `/login` or `/signup` — you should see **Google** under “or use”.
2. Complete the Google flow; you should land on `/dashboard`.

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| No Google button | Both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` must be set; restart dev server. |
| `redirect_uri_mismatch` | Redirect URI in Google must match **exactly** `https://<origin>/api/auth/callback/google`. |
| Consent screen “unverified” | Normal for testing; add test users under **OAuth consent screen** → **Test users** if using External + testing mode. |
