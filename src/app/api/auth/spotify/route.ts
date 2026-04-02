import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SPOTIFY_SCOPES } from "@/lib/providers/spotify/constants";

function appOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", appOrigin(request)));
  }

  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID is not configured" },
      { status: 503 },
    );
  }

  const origin = appOrigin(request);
  const redirectUri = `${origin}/api/auth/spotify/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "false",
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
