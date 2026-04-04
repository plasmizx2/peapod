import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rebalanceSessionQueue } from "@/lib/sessions/rebalance";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  const out = await rebalanceSessionQueue(sessionId, session.user.id);
  if (!out.ok) {
    if (out.reason === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (out.reason === "forbidden") {
      return NextResponse.json({ error: "Host only" }, { status: 403 });
    }
    if (out.reason === "ended") {
      return NextResponse.json({ error: "Session ended" }, { status: 410 });
    }
    if (out.reason === "manual_mode") {
      return NextResponse.json(
        { error: "Rebalance is disabled in manual mode" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
