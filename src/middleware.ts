import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Unauthenticated visits to /dashboard/* go to /login with callbackUrl set to the
 * full path + query (so Spotify OAuth error params like ?spotify_error=invalid_scope
 * survive the round-trip after sign-in).
 *
 * We check cookie presence rather than decrypting the JWT — NextAuth v5 uses JWE
 * which getToken() can't verify in the Edge without the full auth config. The real
 * auth check happens per-page via auth(). This just handles the redirect UX.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const cookies = request.cookies;
  const hasSession =
    cookies.has("authjs.session-token") ||
    cookies.has("__Secure-authjs.session-token") ||
    cookies.has("next-auth.session-token") ||
    cookies.has("__Secure-next-auth.session-token");

  if (hasSession) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
