export const SOLO_PRESETS = [
  { id: "late_night", label: "Late night" },
  { id: "gym", label: "Gym / energy" },
  { id: "focus", label: "Focus" },
  { id: "nostalgic", label: "Nostalgic" },
  { id: "drive", label: "Drive" },
  { id: "sad", label: "Sad / reflective" },
  { id: "chill", label: "Chill" },
  { id: "hype_up", label: "Hype up" },
] as const;

export type SoloPresetId = (typeof SOLO_PRESETS)[number]["id"];

const LABEL: Record<SoloPresetId, string> = {
  late_night: "Late night",
  gym: "Gym / energy",
  focus: "Focus",
  nostalgic: "Nostalgic",
  drive: "Drive",
  sad: "Sad / reflective",
  chill: "Chill",
  hype_up: "Hype up",
};

export function isSoloPresetId(s: string): s is SoloPresetId {
  return SOLO_PRESETS.some((p) => p.id === s);
}

export function presetLabel(preset: SoloPresetId): string {
  return LABEL[preset];
}

export function presetTitle(preset: SoloPresetId): string {
  return `${LABEL[preset]} — for you`;
}

