import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { leaveSession } from "@/lib/sessions/create-session";

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

  const result = await leaveSession(session.user.id, sessionId);

  if (!result.ok) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "You are not in this session" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
