import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { vetoQueueItem, removeVeto } from "@/lib/sessions/veto";

type Ctx = { params: Promise<{ sessionId: string; queueItemId: string }> };

/** POST — cast a veto on a queue item. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, queueItemId } = await ctx.params;
  const result = await vetoQueueItem(sessionId, session.user.id, queueItemId);

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_member: 403,
      ended: 410,
      not_found: 404,
      already_played: 409,
    };
    return NextResponse.json(
      { error: result.reason },
      { status: statusMap[result.reason] ?? 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    vetoCount: result.vetoCount,
    memberCount: result.memberCount,
  });
}

/** DELETE — remove your veto from a queue item. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, queueItemId } = await ctx.params;
  const result = await removeVeto(sessionId, session.user.id, queueItemId);

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_member: 403,
      ended: 410,
      not_found: 404,
      already_played: 409,
    };
    return NextResponse.json(
      { error: result.reason },
      { status: statusMap[result.reason] ?? 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    vetoCount: result.vetoCount,
    memberCount: result.memberCount,
  });
}
