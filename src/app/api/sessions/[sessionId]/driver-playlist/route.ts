import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAndAssignDriverSavePlaylist } from "@/lib/sessions/host-driving-playlist";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Host: create a private “PeaPod · Driving log” playlist and attach it for auto-save. */
export async function POST(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  const out = await createAndAssignDriverSavePlaylist(
    session.user.id,
    sessionId,
  );

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
    return NextResponse.json(
      { error: "Could not create playlist — check Spotify is linked." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, playlistId: out.playlistId });
}
