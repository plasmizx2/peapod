import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { joinSessionByCode } from "@/lib/sessions/create-session";
import { normalizeJoinCode } from "@/lib/sessions/join-code";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { joinCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = normalizeJoinCode(typeof body.joinCode === "string" ? body.joinCode : "");
  if (code.length < 4) {
    return NextResponse.json({ error: "Enter a valid join code" }, { status: 400 });
  }

  const result = await joinSessionByCode(session.user.id, code);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "No session with that code" }, { status: 404 });
    }
    return NextResponse.json({ error: "That session has ended" }, { status: 410 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: result.sessionId,
    alreadyMember: result.alreadyMember,
  });
}
