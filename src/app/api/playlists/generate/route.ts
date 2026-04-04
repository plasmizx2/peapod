import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userTrackStats } from "@/db/schema";
import { ensureUserListeningStats } from "@/lib/data/rebuild-user-stats";
import { isSoloPresetId } from "@/lib/playlists/presets";
import { generateSoloPlaylist } from "@/lib/playlists/solo-generate";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { preset?: string };
  try {
    body = (await req.json()) as { preset?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const presetRaw = body.preset;
  if (!presetRaw || !isSoloPresetId(presetRaw)) {
    return NextResponse.json({ error: "Unknown preset" }, { status: 400 });
  }

  const userId = session.user.id;

  await ensureUserListeningStats(userId);

  const [{ n }] = await db
    .select({ n: count() })
    .from(userTrackStats)
    .where(eq(userTrackStats.userId, userId));

  if (Number(n ?? 0) === 0) {
    return NextResponse.json(
      { error: "No listening data yet — sync Spotify under Music services." },
      { status: 400 },
    );
  }

  try {
    const result = await generateSoloPlaylist(userId, presetRaw);
    return NextResponse.json({
      ok: true,
      playlistId: result.playlistId,
      title: result.title,
      tracks: result.tracks,
    });
  } catch (e) {
    console.error("[playlists/generate]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }
}
