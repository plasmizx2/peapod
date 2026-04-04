import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SpotifyTrackPayload } from "@/lib/spotify/catalog-track";
import { upsertCatalogTrack } from "@/lib/spotify/catalog-track";
import { spotifyUserGet } from "@/lib/spotify/user-api";
import { rateLimit } from "@/lib/rate-limit";
import { appendSessionQueueTrack, reorderSessionQueue } from "@/lib/sessions/queue";

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

  let body: { orderedQueueItemIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.orderedQueueItemIds;
  if (!Array.isArray(raw) || !raw.every((id) => typeof id === "string")) {
    return NextResponse.json(
      { error: "orderedQueueItemIds must be an array of strings" },
      { status: 400 },
    );
  }

  const out = await reorderSessionQueue(sessionId, session.user.id, raw);
  if (!out.ok) {
    if (out.reason === "not_member") {
      return NextResponse.json({ error: "Not in this session" }, { status: 403 });
    }
    if (out.reason === "ended") {
      return NextResponse.json({ error: "Session has ended" }, { status: 410 });
    }
    if (out.reason === "not_host") {
      return NextResponse.json({ error: "Host only" }, { status: 403 });
    }
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  if (
    !rateLimit(`queue-add:${session.user.id}:${sessionId}`, 45, 60_000)
  ) {
    return NextResponse.json(
      { error: "Too many tracks added — wait a moment." },
      { status: 429 },
    );
  }

  let body: { spotifyTrackId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const spotifyTrackId =
    typeof body.spotifyTrackId === "string" ? body.spotifyTrackId.trim() : "";
  if (!spotifyTrackId) {
    return NextResponse.json({ error: "spotifyTrackId required" }, { status: 400 });
  }

  const url = `https://api.spotify.com/v1/tracks/${encodeURIComponent(spotifyTrackId)}`;
  const res = await spotifyUserGet(session.user.id, url);

  if (!res.ok) {
    const t = await res.text();
    console.error("[queue] Spotify track fetch", res.status, t.slice(0, 300));
    return NextResponse.json(
      { error: "Could not load track from Spotify" },
      { status: res.status === 404 ? 404 : 502 },
    );
  }

  const json = (await res.json()) as SpotifyTrackPayload;
  const trackId = await upsertCatalogTrack(json);
  if (!trackId) {
    return NextResponse.json({ error: "Invalid track payload" }, { status: 422 });
  }

  const added = await appendSessionQueueTrack(sessionId, session.user.id, trackId);
  if (!added.ok) {
    if (added.reason === "ended") {
      return NextResponse.json({ error: "Session has ended" }, { status: 410 });
    }
    return NextResponse.json({ error: "Not in this session" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    queueItemId: added.queueItemId,
    position: added.position,
  });
}
