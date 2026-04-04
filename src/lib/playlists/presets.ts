export const SOLO_PRESETS = [
  { id: "late_night", label: "Late night" },
  { id: "gym", label: "Gym / energy" },
  { id: "focus", label: "Focus" },
  { id: "nostalgic", label: "Nostalgic" },
] as const;

export type SoloPresetId = (typeof SOLO_PRESETS)[number]["id"];

const LABEL: Record<SoloPresetId, string> = {
  late_night: "Late night",
  gym: "Gym / energy",
  focus: "Focus",
  nostalgic: "Nostalgic",
};

export function isSoloPresetId(s: string): s is SoloPresetId {
  return SOLO_PRESETS.some((p) => p.id === s);
}

export function presetTitle(preset: SoloPresetId): string {
  return `${LABEL[preset]} — for you`;
}
