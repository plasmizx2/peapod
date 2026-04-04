import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSessionLobbyForUser } from "@/lib/sessions/create-session";
import { getHostNowPlayingPayload } from "@/lib/spotify/player-devices";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Host Spotify playback snapshot for the lobby (session members). */
export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  const lobby = await getSessionLobbyForUser(sessionId, session.user.id);
  if (!lobby) {
    return NextResponse.json({ error: "Not in this session" }, { status: 403 });
  }

  const nowPlaying = await getHostNowPlayingPayload(lobby.hostUserId);
  if (!nowPlaying) {
    return NextResponse.json({
      ok: true,
      nowPlaying: null,
      error: "Could not read Spotify state",
    });
  }

  return NextResponse.json({ ok: true, nowPlaying });
}
