import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  importSpotifyPlaylistIntoSession,
  parseSpotifyPlaylistId,
} from "@/lib/sessions/playlist-import";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  if (!rateLimit(`playlist-import:${session.user.id}`, 8, 3_600_000)) {
    return NextResponse.json(
      { error: "Playlist import limit reached — try again in a while." },
      { status: 429 },
    );
  }

  let body: { playlistUrlOrId?: string; interleave?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    typeof body.playlistUrlOrId === "string" ? body.playlistUrlOrId.trim() : "";
  const playlistId = parseSpotifyPlaylistId(raw);
  if (!playlistId) {
    return NextResponse.json(
      { error: "Paste a Spotify playlist link or playlist id" },
      { status: 400 },
    );
  }

  const interleave = Boolean(body.interleave);

  const out = await importSpotifyPlaylistIntoSession(
    sessionId,
    session.user.id,
    playlistId,
    { interleave },
  );

  if (!out.ok) {
    if (out.reason === "not_member") {
      return NextResponse.json({ error: "Not in this session" }, { status: 403 });
    }
    if (out.reason === "ended") {
      return NextResponse.json({ error: "Session has ended" }, { status: 410 });
    }
    if (out.reason === "fetch_failed") {
      return NextResponse.json(
        {
          error:
            "Could not read that playlist — link Spotify, or use a playlist you can open in your account.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "No tracks could be imported" },
      { status: 400 },
    );
  }

  const payload = {
    ok: true as const,
    imported: out.imported,
    skippedDuplicates: out.skippedDuplicates,
    scannedFromPlaylist: out.scannedFromPlaylist,
    interleaved: out.interleaved,
    ...(out.imported === 0
      ? {
          message:
            "Every track was already in the unplayed queue or repeated in the playlist.",
        }
      : {}),
  };

  return NextResponse.json(payload);
}
