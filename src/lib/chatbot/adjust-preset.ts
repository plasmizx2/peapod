import type { SoloPresetId } from "@/lib/playlists/presets";

const ROTATE: SoloPresetId[] = ["late_night", "gym", "focus", "nostalgic"];

/**
 * Lift → more energy (gym). Stay → unchanged. Shift → rotate preset ring.
 */
export function applyMoodAdjustment(
  last: SoloPresetId,
  adjustment: "lift" | "stay" | "shift",
): SoloPresetId {
  if (adjustment === "lift") return "gym";
  if (adjustment === "stay") return last;
  const i = ROTATE.indexOf(last);
  const next = i < 0 ? 1 : (i + 1) % ROTATE.length;
  return ROTATE[next]!;
}
