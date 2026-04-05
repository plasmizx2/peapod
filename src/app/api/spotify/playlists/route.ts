import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  SpotifyNotLinkedError,
  SpotifyTokenError,
} from "@/lib/spotify/access-token";
import { spotifyUserGet } from "@/lib/spotify/user-api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = "https://api.spotify.com/v1/me/playlists?limit=50";

  let res: Response;
  try {
    res = await spotifyUserGet(session.user.id, url);
  } catch (e) {
    if (e instanceof SpotifyNotLinkedError) {
      return NextResponse.json(
        {
          error: "Link Spotify under Music services to load playlists.",
          needsSpotifyReconnect: true,
        },
        { status: 503 },
      );
    }
    if (e instanceof SpotifyTokenError) {
      return NextResponse.json(
        {
          error: "Reconnect Spotify under Music services.",
          needsSpotifyReconnect: true,
        },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!res.ok) {
    const t = await res.text();
    console.error("[spotify/playlists]", res.status, t.slice(0, 300));
    const scopeIssue =
      res.status === 403 &&
      /Insufficient client scope/i.test(t);
    if (scopeIssue || res.status === 403) {
      return NextResponse.json(
        {
          error:
            "Spotify blocked playlist access — open Music services and tap Reconnect so we can request playlist permissions.",
          needsSpotifyReconnect: true,
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Could not load playlists — try again or reconnect Spotify." },
      { status: 502 },
    );
  }

  const json = (await res.json()) as {
    items?: {
      id: string;
      name: string;
      tracks?: { total: number };
    }[];
  };

  const playlists = (json.items ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    tracksTotal: p.tracks?.total ?? 0,
  }));

  return NextResponse.json({ ok: true, playlists });
}
