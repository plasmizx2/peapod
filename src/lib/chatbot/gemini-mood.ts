import type { SoloPresetId } from "@/lib/playlists/presets";
import { isSoloPresetId, presetLabel } from "@/lib/playlists/presets";

export type GeminiMoodPlan = {
  preset: SoloPresetId;
  intentLabel: string;
  reasoning: string;
  /** Short Spotify-search phrases (not URLs) for ~20% “new” picks */
  discoveryQueries: string[];
};

type GeminiJson = {
  preset?: string;
  intent_short?: string;
  reasoning?: string;
  discovery_queries?: unknown;
};

/**
 * Gemini model id for generativelanguage API.
 * Default: Gemini 2.0 Flash (fast + widely available).
 */
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Uses Google Gemini to map the user prompt + pattern summary to a preset and
 * discovery search queries. Returns null if GEMINI_API_KEY is missing or the call fails.
 */
export async function planMoodWithGemini(
  userPrompt: string,
  patternContext: string,
): Promise<GeminiMoodPlan | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return null;
  }
  const model = (process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL).slice(0, 80);

  const system = `You are PeaPod's DJ brain. Choose music intent from the user's message and their real listening patterns.

Return ONLY valid JSON (no markdown) with this shape:
{
  "preset": one of: late_night | gym | focus | nostalgic | drive | sad | chill | hype_up,
  "intent_short": "2-5 words for a UI subtitle",
  "reasoning": "One sentence explaining why this fits THIS user (reference patterns when useful).",
  "discovery_queries": [ "3 to 5 short Spotify search queries" ]
}

Rules:
- preset must match mood/activity in the user message.
- discovery_queries: phrases that work in Spotify track search — styles, genres, or artist+descriptor. They should surface music SIMILAR to the user's taste but not only their top artists, to diversify (~20% of a playlist).
- Keep discovery_queries in English unless the user wrote in another language (then match their language).`;

  const user = `User message:\n${userPrompt.slice(0, 2000)}\n\nTheir patterns:\n${patternContext.slice(0, 4000)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${system}\n\n---\n\n${user}` }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[gemini-mood]", res.status, errText.slice(0, 500));
      return null;
    }

    const raw = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      raw.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    if (!text.trim()) {
      return null;
    }

    const parsed = JSON.parse(text) as GeminiJson;
    const presetRaw = typeof parsed.preset === "string" ? parsed.preset.trim() : "";
    if (!isSoloPresetId(presetRaw)) {
      console.error("[gemini-mood] invalid preset", presetRaw);
      return null;
    }

    const dq = parsed.discovery_queries;
    const discoveryQueries: string[] = [];
    if (Array.isArray(dq)) {
      for (const x of dq) {
        if (typeof x === "string" && x.trim().length > 1) {
          discoveryQueries.push(x.trim().slice(0, 200));
        }
        if (discoveryQueries.length >= 6) break;
      }
    }

    const fallbacks = [
      `${presetLabel(presetRaw)} playlist`,
      `indie ${presetLabel(presetRaw)}`,
      `${presetLabel(presetRaw)} alternative`,
    ];
    let fb = 0;
    while (discoveryQueries.length < 3 && fb < fallbacks.length) {
      discoveryQueries.push(fallbacks[fb]!);
      fb += 1;
    }

    const intentShort =
      typeof parsed.intent_short === "string" && parsed.intent_short.trim()
        ? parsed.intent_short.trim().slice(0, 80)
        : presetLabel(presetRaw);

    const reasoning =
      typeof parsed.reasoning === "string" && parsed.reasoning.trim()
        ? parsed.reasoning.trim().slice(0, 400)
        : `Matched your request to the ${presetLabel(presetRaw)} mix using your patterns.`;

    return {
      preset: presetRaw,
      intentLabel: intentShort,
      reasoning,
      discoveryQueries: discoveryQueries.slice(0, 5),
    };
  } catch (e) {
    console.error("[gemini-mood]", e);
    return null;
  }
}
