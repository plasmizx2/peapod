import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { spotifyUserGet } from "@/lib/spotify/user-api";

const SEARCH_WINDOW_MS = 60_000;
const SEARCH_MAX_PER_WINDOW = 40;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !rateLimit(
      `spotify-search:${session.user.id}`,
      SEARCH_MAX_PER_WINDOW,
      SEARCH_WINDOW_MS,
    )
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

  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({
    q,
    type: "track",
    limit: "12",
  })}`;

  const res = await spotifyUserGet(session.user.id, url);
  if (!res.ok) {
    const t = await res.text();
    console.error("[spotify/search]", res.status, t.slice(0, 300));
    return NextResponse.json({ error: "Spotify search failed" }, { status: 502 });
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
