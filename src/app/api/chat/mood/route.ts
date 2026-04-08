import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatbotRequests, userTrackStats } from "@/db/schema";
import { applyMoodAdjustment } from "@/lib/chatbot/adjust-preset";
import { planMoodWithGemini } from "@/lib/chatbot/gemini-mood";
import { mapPromptToPreset } from "@/lib/chatbot/map-intent";
import {
  buildAdjustmentExplanation,
  buildGeminiMoodExplanation,
  buildMoodExplanation,
} from "@/lib/chatbot/mood-explanation";
import { buildUserPatternContextBlock } from "@/lib/chatbot/user-pattern-context";
import { ensureUserListeningStats } from "@/lib/data/rebuild-user-stats";
import type { SoloPresetId } from "@/lib/playlists/presets";
import { presetLabel } from "@/lib/playlists/presets";
import {
  generateChatBlendedPlaylist,
  generatePresetPlaylist,
  loadGeneratedPlaylistForUser,
} from "@/lib/playlists/solo-generate";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: {
    prompt?: string;
    adjustment?: string;
    lastPlaylistId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

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

  const isAdj =
    body.adjustment === "lift" ||
    body.adjustment === "stay" ||
    body.adjustment === "shift";
  const lastId =
    typeof body.lastPlaylistId === "string" ? body.lastPlaylistId.trim() : "";

  if (body.adjustment !== undefined && body.adjustment !== "") {
    if (!isAdj) {
      return NextResponse.json({ error: "Invalid adjustment" }, { status: 400 });
    }
    if (!lastId) {
      return NextResponse.json(
        { error: "lastPlaylistId is required for Lift / Stay / Shift" },
        { status: 400 },
      );
    }
  }

  if (isAdj && lastId) {
    const adj = body.adjustment as "lift" | "stay" | "shift";

    const loaded = await loadGeneratedPlaylistForUser(userId, lastId);
    if (!loaded) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const fromPreset = loaded.preset;
    const toPreset = applyMoodAdjustment(fromPreset, adj);
    const explanation = buildAdjustmentExplanation(adj, fromPreset, toPreset);

    if (adj === "stay") {
      await db.insert(chatbotRequests).values({
        userId,
        promptText: `(follow-up: ${adj})`,
        mappedPreset: toPreset,
        intentLabel: presetLabel(toPreset),
        explanation,
        playlistId: loaded.playlistId,
        adjustment: adj,
      });

      return NextResponse.json({
        ok: true,
        playlistId: loaded.playlistId,
        title: loaded.title,
        preset: toPreset,
        explanation,
        tracks: loaded.tracks,
        intentLabel: presetLabel(toPreset),
        moodEngine: loaded.moodEngine,
      });
    }

    const result = await generatePresetPlaylist(userId, toPreset, {
      sourceType: "chatbot",
      titleOverride: `Chat — ${presetLabel(toPreset)}`,
    });

    await db.insert(chatbotRequests).values({
      userId,
      promptText: `(follow-up: ${adj})`,
      mappedPreset: toPreset,
      intentLabel: presetLabel(toPreset),
      explanation,
      playlistId: result.playlistId,
      adjustment: adj,
    });

    return NextResponse.json({
      ok: true,
      playlistId: result.playlistId,
      title: result.title,
      preset: toPreset,
      explanation,
      tracks: result.tracks,
      intentLabel: presetLabel(toPreset),
      moodEngine: result.moodEngine,
    });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      { error: "Describe a mood or moment (or use Lift / Stay / Shift after a playlist)." },
      { status: 400 },
    );
  }

  const patternContext = await buildUserPatternContextBlock(userId);
  const geminiPlan = await planMoodWithGemini(prompt, patternContext);

  let preset: SoloPresetId;
  let intentLabel: string;
  let explanation: string;
  let result: Awaited<ReturnType<typeof generatePresetPlaylist>>;

  if (geminiPlan) {
    preset = geminiPlan.preset;
    intentLabel = geminiPlan.intentLabel;
    explanation = buildGeminiMoodExplanation(geminiPlan);
    result = await generateChatBlendedPlaylist(userId, preset, {
      titleOverride: `Chat — ${presetLabel(preset)}`,
      discoveryQueries: geminiPlan.discoveryQueries,
    });
  } else {
    const mapped = mapPromptToPreset(prompt);
    preset = mapped.preset;
    intentLabel = mapped.intentLabel;
    explanation = buildMoodExplanation(preset, intentLabel);
    result = await generatePresetPlaylist(userId, preset, {
      sourceType: "chatbot",
      titleOverride: `Chat — ${presetLabel(preset)}`,
    });
  }

  await db.insert(chatbotRequests).values({
    userId,
    promptText: prompt.slice(0, 2000),
    mappedPreset: preset,
    intentLabel,
    explanation,
    playlistId: result.playlistId,
    adjustment: null,
  });

  return NextResponse.json({
    ok: true,
    playlistId: result.playlistId,
    title: result.title,
    preset,
    explanation,
    tracks: result.tracks,
    intentLabel,
    moodEngine: result.moodEngine,
  });
}
