import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserProfile,
  updateUserProfile,
  isFriendCodeAvailable,
} from "@/lib/data/profile";

/** GET — fetch the current user's profile. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getUserProfile(session.user.id);
  return NextResponse.json(profile);
}

/** PATCH — update the current user's profile. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "displayName",
    "bio",
    "avatarUrl",
    "friendCode",
    "phoneNumber",
    "listeningVisibility",
    "sessionHistoryVisible",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      data[key] = body[key];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  // Validate friend code uniqueness if being changed
  if (data.friendCode && typeof data.friendCode === "string") {
    const code = (data.friendCode as string).toUpperCase().trim();
    if (code.length < 3 || code.length > 16) {
      return NextResponse.json(
        { error: "Friend code must be 3-16 characters" },
        { status: 400 },
      );
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      return NextResponse.json(
        { error: "Friend code can only contain letters, numbers, and underscores" },
        { status: 400 },
      );
    }
    const available = await isFriendCodeAvailable(code, session.user.id);
    if (!available) {
      return NextResponse.json(
        { error: "That friend code is already taken" },
        { status: 409 },
      );
    }
  }

  const profile = await updateUserProfile(session.user.id, data as Parameters<typeof updateUserProfile>[1]);
  return NextResponse.json(profile);
}
