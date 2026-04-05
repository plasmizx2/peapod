import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserProfile, updateUserProfile } from "@/lib/data/profile";

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

  const profile = await updateUserProfile(session.user.id, data as Parameters<typeof updateUserProfile>[1]);
  return NextResponse.json(profile);
}
