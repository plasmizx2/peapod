import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  SpotifyNotLinkedError,
  SpotifyTokenError,
} from "@/lib/spotify/access-token";
import { spotifyUserGet } from "@/lib/spotify/user-api";

/**
 * Current user’s Spotify profile (for UI: “playlists from …”).
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
      const t = await res.text();
      console.error("[spotify/me]", res.status, t.slice(0, 300));
      return NextResponse.json(
        { error: "Could not load Spotify profile." },
        { status: 502 },
      );
    }
    const me = (await res.json()) as {
      id: string;
      display_name?: string | null;
    };
    return NextResponse.json({
      ok: true,
      spotifyUser: {
        id: me.id,
        displayName: me.display_name?.trim() || null,
      },
    });
  } catch (e) {
    if (e instanceof SpotifyNotLinkedError) {
      return NextResponse.json(
        { error: "Spotify isn’t linked.", needsSpotifyReconnect: true },
        { status: 503 },
      );
    }
    if (e instanceof SpotifyTokenError) {
      if (
        typeof e.message === "string" &&
        e.message.includes("not configured")
      ) {
        return NextResponse.json(
          { error: "Spotify isn’t configured here." },
          { status: 503 },
        );
      }
      return NextResponse.json(
        {
          error: "Spotify session needs a refresh.",
          needsSpotifyReconnect: true,
        },
        { status: 503 },
      );
    }
    throw e;
  }
}
