import { NextResponse } from "next/server";
import { auth } from "@/auth";
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

  let body: { playlistUrlOrId?: string };
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

  const out = await importSpotifyPlaylistIntoSession(
    sessionId,
    session.user.id,
    playlistId,
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

  return NextResponse.json({ ok: true, imported: out.imported });
}
