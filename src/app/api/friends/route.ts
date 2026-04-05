import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getFriends,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriendship,
} from "@/lib/data/friends";

/** GET — list all friends and pending requests. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const friends = await getFriends(session.user.id);
  return NextResponse.json({ friends });
}

/** POST — send a friend request by email. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const email = body?.email;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const result = await sendFriendRequest(session.user.id, email);
  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "No user found with that email.",
      self: "You can't add yourself.",
      already_exists: "Friend request already exists.",
    };
    return NextResponse.json(
      { error: messages[result.reason] ?? result.reason },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, friendshipId: result.friendshipId });
}

/** PATCH — accept or decline a friend request. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { friendshipId, action } = body ?? {};
  if (!friendshipId || !["accepted", "declined"].includes(action)) {
    return NextResponse.json(
      { error: "friendshipId and action (accepted|declined) required" },
      { status: 400 },
    );
  }

  const result = await respondToFriendRequest(session.user.id, friendshipId, action);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — remove a friendship (unfriend). */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const friendshipId = searchParams.get("id");
  if (!friendshipId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const result = await removeFriendship(session.user.id, friendshipId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
