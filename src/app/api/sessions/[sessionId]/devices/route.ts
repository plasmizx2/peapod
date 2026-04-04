import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSessionLobbyForUser } from "@/lib/sessions/create-session";
import {
  getSpotifyDevices,
  transferPlaybackToDevice,
} from "@/lib/spotify/player-devices";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** List host Spotify Connect devices (session members). */
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

  const devices = await getSpotifyDevices(lobby.hostUserId);
  return NextResponse.json({ devices });
}

/** Transfer playback to a device (host only). */
export async function POST(req: Request, context: RouteContext) {
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
  if (lobby.status !== "active") {
    return NextResponse.json({ error: "Session has ended" }, { status: 410 });
  }
  if (session.user.id !== lobby.hostUserId) {
    return NextResponse.json({ error: "Host only" }, { status: 403 });
  }

  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceId =
    typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const res = await transferPlaybackToDevice(session.user.id, deviceId);
  if (!res.ok) {
    const t = await res.text();
    console.error("[devices] transfer", res.status, t.slice(0, 200));
    return NextResponse.json(
      { error: "Could not switch device — open Spotify on that device first." },
      { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
