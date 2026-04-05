import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  SpotifyNotLinkedError,
  SpotifyTokenError,
} from "@/lib/spotify/access-token";
import { spotifyUserGet } from "@/lib/spotify/user-api";

const SEARCH_WINDOW_MS = 60_000;
const SEARCH_MAX_PER_WINDOW = 40;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !(await rateLimit(
      `spotify-search:${session.user.id}`,
      SEARCH_MAX_PER_WINDOW,
      SEARCH_WINDOW_MS,
    ))
  ) {
    return NextResponse.json(
      { error: "Too many searches — try again in a minute." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  // Spotify Search API: limit per type is 0–10 (not 50). Values above 10 return 400 Invalid limit.
  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({
    q,
    type: "track",
    limit: "10",
  })}`;

  let res: Response;
  try {
    res = await spotifyUserGet(session.user.id, url);
  } catch (e) {
    if (e instanceof SpotifyNotLinkedError) {
      return NextResponse.json(
        {
          error: "Spotify isn’t linked. Connect it under Music services.",
          needsSpotifyReconnect: true,
        },
        { status: 503 },
      );
    }
    if (e instanceof SpotifyTokenError) {
      if (
        typeof e.message === "string" &&
        e.message.includes("not configured")
      ) {
        return NextResponse.json(
          { error: "Search is temporarily unavailable." },
          { status: 503 },
        );
      }
      return NextResponse.json(
        {
          error:
            "Spotify access needs a refresh. Open Music services and tap Reconnect.",
          needsSpotifyReconnect: true,
        },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!res.ok) {
    const t = await res.text();
    console.error("[spotify/search]", res.status, t.slice(0, 300));
    const authish = res.status === 401 || res.status === 403;
    return NextResponse.json(
      {
        error: authish
          ? "Spotify rejected this request. Reconnect under Music services."
          : "Spotify search failed.",
        needsSpotifyReconnect: authish,
      },
      { status: 502 },
    );
  }

  const json = (await res.json()) as {
    tracks?: {
      items?: {
        id: string;
        name: string;
        artists: { name: string }[];
        album?: { name?: string };
      }[];
    };
  };

  const items = json.tracks?.items ?? [];
  return NextResponse.json({
    ok: true,
    tracks: items.map((t) => ({
      id: t.id,
      name: t.name,
      artistName: t.artists.map((a) => a.name).join(", "),
      albumName: t.album?.name ?? null,
    })),
  });
}
