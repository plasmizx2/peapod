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
      "cardio",
      "lift",
      "lifting",
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
  {
    preset: "drive",
    label: "driving vibes",
    words: [
      "drive",
      "driving",
      "road",
      "highway",
      "cruise",
      "cruising",
      "car",
      "road trip",
      "roadtrip",
      "windows down",
      "commute",
    ],
  },
  {
    preset: "sad",
    label: "sad / reflective",
    words: [
      "sad",
      "breakup",
      "heartbreak",
      "cry",
      "crying",
      "miss",
      "lonely",
      "alone",
      "hurt",
      "pain",
      "depressed",
      "down",
      "emotional",
      "broken",
      "feel",
      "feelings",
    ],
  },
  {
    preset: "chill",
    label: "chill vibes",
    words: [
      "chill",
      "relax",
      "relaxing",
      "vibe",
      "vibes",
      "mellow",
      "lowkey",
      "low key",
      "smooth",
      "easy",
      "laid back",
      "laidback",
      "cozy",
      "lazy",
    ],
  },
  {
    preset: "hype_up",
    label: "hype / pregame",
    words: [
      "hype",
      "hyped",
      "turnt",
      "pregame",
      "pre-game",
      "lit",
      "energy",
      "pump",
      "pumped",
      "party",
      "dance",
      "turn up",
      "turnup",
      "get ready",
      "amp",
      "amped",
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
    drive: 0,
    sad: 0,
    chill: 0,
    hype_up: 0,
  };

  for (const rule of RULES) {
    scores[rule.preset] = scorePrompt(lower, rule.words);
  }

  const tieOrder: SoloPresetId[] = [
    "focus",
    "gym",
    "late_night",
    "nostalgic",
    "drive",
    "sad",
    "chill",
    "hype_up",
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

