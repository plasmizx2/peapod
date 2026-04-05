/**
 * Rate limiter — uses Upstash Redis when credentials are configured,
 * falls back to an in-memory sliding-window store otherwise.
 *
 * Required env vars (set in Render + .env.local):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

// ─── Upstash path ──────────────────────────────────────────────────────────

let upstashLimiter: ReturnType<typeof buildUpstash> | null = null;

function buildUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || url.includes("stub")) return null;

  // Dynamic require keeps this out of the Edge bundle when not configured.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Ratelimit } = require("@upstash/ratelimit") as typeof import("@upstash/ratelimit");

  const redis = new Redis({ url, token });

  return {
    redis,
    Ratelimit,
    get: (key: string, max: number, windowMs: number) => {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${windowMs}ms`),
        prefix: "rl",
      });
      return limiter.limit(key);
    },
  };
}

// ─── In-memory fallback ─────────────────────────────────────────────────────

const buckets = new Map<string, number[]>();

function inMemoryLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const pruned = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (pruned.length >= max) {
    buckets.set(key, pruned);
    return false;
  }
  pruned.push(now);
  buckets.set(key, pruned);
  return true;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns `true` when the request is allowed, `false` when rate-limited.
 *
 * @param key       Unique identifier (e.g. "spotify-search:{userId}")
 * @param max       Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  try {
    if (!upstashLimiter) {
      upstashLimiter = buildUpstash();
    }
    if (upstashLimiter) {
      const result = await upstashLimiter.get(key, max, windowMs);
      return result.success;
    }
  } catch (err) {
    console.warn("[rate-limit] Upstash error, falling back to in-memory:", err);
  }
  return inMemoryLimit(key, max, windowMs);
}
