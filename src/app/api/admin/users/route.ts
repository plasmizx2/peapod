import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin, getAllUsers } from "@/lib/data/admin";

/** GET — list all users (admin only). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}
