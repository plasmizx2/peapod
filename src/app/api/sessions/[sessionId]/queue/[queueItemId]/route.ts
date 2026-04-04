import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeSessionQueueItem } from "@/lib/sessions/queue";

type RouteContext = {
  params: Promise<{ sessionId: string; queueItemId: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, queueItemId } = await context.params;
  if (!sessionId || !queueItemId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const out = await removeSessionQueueItem(sessionId, session.user.id, queueItemId);
  if (!out.ok) {
    if (out.reason === "not_member") {
      return NextResponse.json({ error: "Not in this session" }, { status: 403 });
    }
    if (out.reason === "ended") {
      return NextResponse.json({ error: "Session has ended" }, { status: 410 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
