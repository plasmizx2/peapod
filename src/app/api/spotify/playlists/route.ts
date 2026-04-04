import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { spotifyUserGet } from "@/lib/spotify/user-api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = "https://api.spotify.com/v1/me/playlists?limit=50";

  const res = await spotifyUserGet(session.user.id, url);
  if (!res.ok) {
    const t = await res.text();
    console.error("[spotify/playlists]", res.status, t.slice(0, 300));
    return NextResponse.json(
      { error: "Could not load playlists — link Spotify in Music services." },
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
