import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { oauthAppOrigin } from "@/lib/oauth/app-origin";
import { SPOTIFY_SCOPES } from "@/lib/providers/spotify/constants";

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", oauthAppOrigin(request)));
  }

  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID is not configured" },
      { status: 503 },
    );
  }

  const { searchParams: qs } = new URL(request.url);
  const forceConsent =
    qs.get("reconnect") === "1" ||
    qs.get("show_dialog") === "true" ||
    qs.get("show_dialog") === "1";

  const origin = oauthAppOrigin(request);
  const redirectUri = `${origin}/api/auth/spotify/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    /** Forces approval screen so new scopes (e.g. playlist-read-collaborative) take effect. */
    show_dialog: forceConsent ? "true" : "false",
  });

  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  const res = NextResponse.redirect(url);
  res.cookies.set("pp_spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
