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

  if (!(await rateLimit(`playlist-import:${session.user.id}`, 8, 3_600_000))) {
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
    if (out.reason === "playlist_not_found") {
      return NextResponse.json(
        {
          error:
            "That playlist wasn’t found. Check the link or id — or try opening the playlist in Spotify first, then paste the same URL from the share menu.",
        },
        { status: 404 },
      );
    }
    if (out.reason === "playlist_forbidden") {
      return NextResponse.json(
        {
          error:
            "Spotify won’t open that playlist for your account. If it’s someone else’s private list, ask them to invite you or make it public; your own private playlists should work when you’re signed into the same Spotify account here.",
        },
        { status: 403 },
      );
    }
    if (out.reason === "spotify_rate_limited") {
      return NextResponse.json(
        { error: "Spotify rate limit — try again in a minute." },
        { status: 429 },
      );
    }
    if (out.reason === "spotify_not_linked") {
      return NextResponse.json(
        {
          error: "Link Spotify under Music services to import playlists.",
          needsSpotifyReconnect: true,
        },
        { status: 503 },
      );
    }
    if (out.reason === "spotify_token") {
      return NextResponse.json(
        {
          error: "Spotify session expired — reconnect under Music services.",
          needsSpotifyReconnect: true,
        },
        { status: 503 },
      );
    }
    if (out.reason === "fetch_failed") {
      const hint =
        out.httpStatus >= 500
          ? "Spotify had a server error — try again in a moment."
          : "Couldn’t read that playlist from Spotify. Check the link, reconnect under Music services if needed, or use a playlist you can open in the Spotify app while logged in as this account.";
      return NextResponse.json({ error: hint }, { status: 502 });
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
