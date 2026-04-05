import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processDriverLogAfterVote } from "@/lib/sessions/driver-save";
import { upsertSessionVote } from "@/lib/sessions/queue";
import { autoRebalanceIfParty } from "@/lib/sessions/rebalance";

type RouteContext = {
  params: Promise<{ sessionId: string; queueItemId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, queueItemId } = await context.params;
  if (!sessionId || !queueItemId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { value?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.value;
  const value = raw === 1 ? 1 : raw === -1 ? -1 : raw === 0 ? 0 : null;
  if (value === null) {
    return NextResponse.json(
      { error: "value must be -1, 0, or 1" },
      { status: 400 },
    );
  }

  const out = await upsertSessionVote(
    sessionId,
    session.user.id,
    queueItemId,
    value,
  );

  if (!out.ok) {
    if (out.reason === "not_member") {
      return NextResponse.json({ error: "Not in this session" }, { status: 403 });
    }
    if (out.reason === "ended") {
      return NextResponse.json({ error: "Session has ended" }, { status: 410 });
    }
    if (out.reason === "not_found") {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  await Promise.all([
    processDriverLogAfterVote(sessionId, queueItemId),
    autoRebalanceIfParty(sessionId),
  ]);

  return NextResponse.json({ ok: true });
}
