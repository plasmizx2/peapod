import type { SoloPresetId } from "@/lib/playlists/presets";

type Rule = { preset: SoloPresetId; label: string; words: string[] };

const RULES: Rule[] = [
  {
    preset: "late_night",
    label: "late-night wind-down",
    words: [
      "late",
      "night",
      "sleep",
      "sleepy",
      "insomnia",
      "3am",
      "2am",
      "tired",
      "bed",
      "bedtime",
      "dark",
      "moon",
      "quiet",
      "calm",
      "chill",
      "wind down",
      "wind-down",
    ],
  },
  {
    preset: "gym",
    label: "energy / workout",
    words: [
      "gym",
      "workout",
      "run",
      "running",
      "energy",
      "hype",
      "pump",
      "cardio",
      "lift",
      "lifting",
      "party",
      "dance",
      "fast",
      "loud",
    ],
  },
  {
    preset: "focus",
    label: "deep focus",
    words: [
      "focus",
      "study",
      "studying",
      "work",
      "deep work",
      "concentration",
      "coding",
      "write",
      "writing",
      "exam",
      "read",
      "reading",
      "productive",
    ],
  },
  {
    preset: "nostalgic",
    label: "throwback / memory lane",
    words: [
      "nostalgic",
      "nostalgia",
      "memory",
      "memories",
      "old",
      "throwback",
      "teen",
      "childhood",
      "used to",
      "2010",
      "high school",
      "miss",
    ],
  },
];

function scorePrompt(lower: string, words: string[]): number {
  let s = 0;
  for (const w of words) {
    if (lower.includes(w)) s += w.length >= 6 ? 3 : 2;
  }
  return s;
}

/**
 * Keyword heuristics → solo preset cluster (Phase 5).
 */
export function mapPromptToPreset(prompt: string): {
  preset: SoloPresetId;
  intentLabel: string;
  scores: Record<SoloPresetId, number>;
} {
  const lower = prompt.trim().toLowerCase();
  const scores: Record<SoloPresetId, number> = {
    late_night: 0,
    gym: 0,
    focus: 0,
    nostalgic: 0,
  };

  for (const rule of RULES) {
    scores[rule.preset] = scorePrompt(lower, rule.words);
  }

  const tieOrder: SoloPresetId[] = [
    "focus",
    "gym",
    "late_night",
    "nostalgic",
  ];
  let best: SoloPresetId = "focus";
  let bestScore = -1;
  for (const p of tieOrder) {
    const sc = scores[p];
    if (sc > bestScore) {
      bestScore = sc;
      best = p;
    }
  }

  if (bestScore === 0) {
    return {
      preset: "focus",
      intentLabel: "deep focus",
      scores,
    };
  }

  const label = RULES.find((r) => r.preset === best)!.label;
  return { preset: best, intentLabel: label, scores };
}
