import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportGeneratedPlaylistToSpotify } from "@/lib/playlists/export-generated-to-spotify";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ playlistId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playlistId } = await ctx.params;
  if (!playlistId || typeof playlistId !== "string") {
    return NextResponse.json({ error: "Invalid playlist" }, { status: 400 });
  }

  const out = await exportGeneratedPlaylistToSpotify(session.user.id, playlistId);

  if (!out.ok) {
    const messages: Record<typeof out.error, { status: number; body: string }> =
      {
        not_found: { status: 404, body: "Playlist not found" },
        empty: { status: 400, body: "Playlist has no tracks" },
        not_linked: {
          status: 400,
          body:
            "Link Spotify under Music services to save playlists to your account.",
        },
        spotify: {
          status: 502,
          body:
            out.detail ??
            "Spotify could not create the playlist — try reconnecting.",
        },
      };
    const m = messages[out.error];
    return NextResponse.json({ error: m.body }, { status: m.status });
  }

  return NextResponse.json({
    ok: true,
    spotifyPlaylistId: out.spotifyPlaylistId,
    spotifyUrl: out.spotifyUrl,
  });
}
