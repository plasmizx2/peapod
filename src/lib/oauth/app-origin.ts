/**
 * Origin for OAuth redirect_uri and post-login redirects.
 * Prefers NEXT_PUBLIC_SITE_URL so local dev can reuse the production
 * redirect URI registered in the Spotify Developer Dashboard.
 * Falls back to the incoming request host (correct on production).
 */
export function oauthAppOrigin(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}
