import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getSessionLobbyForUser,
  updateSessionQueueSettings,
} from "@/lib/sessions/create-session";
import { getSessionQueue } from "@/lib/sessions/queue";
import {
  getHostNowPlayingPayloadCached,
  slimNowPlaying,
} from "@/lib/spotify/player-devices";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  let body: {
    queueMode?: string;
    driverUserId?: string | null;
    driverSavePlaylistId?: string | null;
    driverSaveMode?: string;
    driverSaveVoteThreshold?: number;
    driverRejectPlaylistId?: string | null;
    driverRejectVoteThreshold?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const out = await updateSessionQueueSettings(session.user.id, sessionId, {
    queueMode: body.queueMode,
    driverUserId:
      body.driverUserId === undefined
        ? undefined
        : body.driverUserId === null
          ? null
          : String(body.driverUserId),
    driverSavePlaylistId:
      body.driverSavePlaylistId === undefined
        ? undefined
        : body.driverSavePlaylistId === null || body.driverSavePlaylistId === ""
          ? null
          : String(body.driverSavePlaylistId),
    driverSaveMode: body.driverSaveMode,
    driverSaveVoteThreshold: body.driverSaveVoteThreshold,
    driverRejectPlaylistId:
      body.driverRejectPlaylistId === undefined
        ? undefined
        : body.driverRejectPlaylistId === null ||
            body.driverRejectPlaylistId === ""
          ? null
          : String(body.driverRejectPlaylistId),
    driverRejectVoteThreshold: body.driverRejectVoteThreshold,
  });

  if (!out.ok) {
    if (out.error === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (out.error === "forbidden") {
      return NextResponse.json({ error: "Host only" }, { status: 403 });
    }
    if (out.error === "ended") {
      return NextResponse.json({ error: "Session ended" }, { status: 410 });
    }
    if (out.error === "bad_mode") {
      return NextResponse.json({ error: "Invalid queue mode" }, { status: 400 });
    }
    if (out.error === "bad_driver_save") {
      return NextResponse.json(
        { error: "Invalid driving log settings" },
        { status: 400 },
      );
    }
    if (out.error === "driver_not_member") {
      return NextResponse.json(
        { error: "Driver must be a session member" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Could not update" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

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
    return NextResponse.json({ error: "Not found or not a member" }, { status: 404 });
  }

  const queue = await getSessionQueue(sessionId, session.user.id);
  const nowPlaying = slimNowPlaying(
    await getHostNowPlayingPayloadCached(lobby.hostUserId),
  );

  return NextResponse.json({
    ok: true,
    isHost: session.user.id === lobby.hostUserId,
    queue: queue ?? [],
    nowPlaying,
    ...lobby,
  });
}
