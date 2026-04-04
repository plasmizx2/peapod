import type { SoloPresetId } from "@/lib/playlists/presets";
import { presetLabel } from "@/lib/playlists/presets";

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
