import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  SpotifyNotLinkedError,
  SpotifyTokenError,
} from "@/lib/spotify/access-token";
import { spotifyUserGet } from "@/lib/spotify/user-api";

/**
 * Lightweight check: is Spotify linked and can we call the Web API?
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await spotifyUserGet(
      session.user.id,
      "https://api.spotify.com/v1/me",
    );
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        code: "SPOTIFY_API",
        message: "Spotify returned an error — try reconnecting in Music services.",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SpotifyNotLinkedError) {
      return NextResponse.json({
        ok: false,
        code: "NOT_LINKED",
        message: "Spotify isn’t linked yet.",
      });
    }
    if (e instanceof SpotifyTokenError) {
      return NextResponse.json({
        ok: false,
        code: "TOKEN",
        message: "Spotify session needs a refresh — reconnect in Music services.",
      });
    }
    throw e;
  }
}
