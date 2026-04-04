import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  SpotifyNotLinkedError,
  SpotifyTokenError,
} from "@/lib/spotify/access-token";
import { syncRecentlyPlayed } from "@/lib/spotify/sync-recently-played";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncRecentlyPlayed(session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof SpotifyNotLinkedError) {
      return NextResponse.json(
        { error: "Spotify not linked" },
        { status: 400 },
      );
    }
    if (e instanceof SpotifyTokenError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error("[spotify/sync]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}
