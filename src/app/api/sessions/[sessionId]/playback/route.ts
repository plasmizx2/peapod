import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  playAllUnplayedFromSessionQueue,
  playNextFromSessionQueue,
} from "@/lib/sessions/playback";

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

  let body: { action?: string; deviceId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "all" ? "all" : body.action === "next" ? "next" : null;
  if (!action) {
    return NextResponse.json(
      { error: 'action must be "next" or "all"' },
      { status: 400 },
    );
  }

  const deviceId =
    typeof body.deviceId === "string" && body.deviceId.trim().length > 0
      ? body.deviceId.trim()
      : null;

  const result =
    action === "next"
      ? await playNextFromSessionQueue(sessionId, deviceId)
      : await playAllUnplayedFromSessionQueue(sessionId, deviceId);

  if (!result.ok) {
    const status = result.status ?? 502;
    if (result.error.includes("No unplayed") || result.error.includes("empty")) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const payload: { error: string; hint?: string } = {
      error: result.error || "Playback failed",
    };
    if (result.hint) {
      payload.hint = result.hint;
    }
    return NextResponse.json(payload, {
      status: status >= 400 && status < 600 ? status : 502,
    });
  }

  if ("count" in result) {
    return NextResponse.json({ ok: true, count: result.count });
  }
  return NextResponse.json({ ok: true });
}
