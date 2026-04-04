/**
 * Simple in-memory sliding-window rate limiter (per server instance).
 * Suitable for search and light abuse protection — not a distributed quota.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
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
