import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSongOfTheDay } from "@/lib/data/song-of-the-day";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSongOfTheDay(session.user.id);
  
  if (!result) {
    return NextResponse.json({ songOfTheDay: null });
  }

  return NextResponse.json({ songOfTheDay: result });
}
