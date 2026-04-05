import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFriendTimeline } from "@/lib/data/timeline";

/** GET — friend activity timeline. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await getFriendTimeline(session.user.id, 30);
  return NextResponse.json({ events });
}
