import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createListeningSession } from "@/lib/sessions/create-session";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const out = await createListeningSession(session.user.id);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    console.error("[sessions/create]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create session" },
      { status: 500 },
    );
  }
}
