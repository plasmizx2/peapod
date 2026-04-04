import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSessionLobbyForUser } from "@/lib/sessions/create-session";

type RouteContext = { params: Promise<{ sessionId: string }> };

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

  return NextResponse.json({ ok: true, ...lobby });
}
