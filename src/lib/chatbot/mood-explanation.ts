import type { SoloPresetId } from "@/lib/playlists/presets";
import { presetLabel } from "@/lib/playlists/presets";
import type { GeminiMoodPlan } from "@/lib/chatbot/gemini-mood";

export function buildGeminiMoodExplanation(plan: GeminiMoodPlan): string {
  return `${plan.reasoning} Roughly 80% from tracks that match your listening patterns for this vibe; about 20% are discovery picks from Spotify search using queries tuned to you.`;
}

export function buildMoodExplanation(
  preset: SoloPresetId,
  intentLabel: string,
): string {
  const base = `Mapped “${intentLabel}” from what you wrote. `;
  const tail: Record<SoloPresetId, string> = {
    late_night:
      "Pulling from tracks you often play in late-night hours (UTC) plus your repeats.",
    gym: "Leaning on high-repeat, recently active picks — good for movement.",
    focus: "Favoring familiar tracks that usually anchor longer listening sessions.",
    nostalgic:
      "Surfacing older favorites you haven’t replayed as much lately.",
    drive: "Balanced energy picks that work well on the road — familiar but not sleepy.",
    sad: "Pulling from your night-heavy, deeply replayed tracks — reflective territory.",
    chill: "Relaxed mid-range picks — not too energetic, not too moody.",
    hype_up: "Your most replayed, highest-energy tracks — pre-game material.",
  };
  return base + tail[preset];
}

export function buildAdjustmentExplanation(
  adjustment: "lift" | "stay" | "shift",
  fromPreset: SoloPresetId,
  toPreset: SoloPresetId,
): string {
  if (adjustment === "stay") {
    return "Keeping the same mix — your last playlist, unchanged.";
  }
  if (adjustment === "lift") {
    return "More energy — nudged toward your gym-heavy rotation.";
  }
  const from = presetLabel(fromPreset);
  const to = presetLabel(toPreset);
  return `New angle — shifted from ${from} toward ${to} using your library.`;
}
