import { spotifyUserGet, spotifyUserPut } from "@/lib/spotify/user-api";

export type SpotifyDevice = {
  id: string;
  name: string;
  is_active: boolean;
  type: string;
};

export async function getSpotifyDevices(
  userId: string,
): Promise<SpotifyDevice[]> {
  const res = await spotifyUserGet(
    userId,
    "https://api.spotify.com/v1/me/player/devices",
  );
  if (!res.ok) {
    return [];
  }
  const j = (await res.json()) as { devices?: SpotifyDevice[] };
  return j.devices ?? [];
}

/** Move playback to a device (does not start play). */
export async function transferPlaybackToDevice(
  userId: string,
  deviceId: string,
): Promise<Response> {
  return spotifyUserPut(userId, "https://api.spotify.com/v1/me/player", {
    device_ids: [deviceId],
    play: false,
  });
}

export type NowPlayingPayload = {
  isPlaying: boolean;
  deviceName: string | null;
  trackName: string | null;
  artistName: string | null;
  progressMs: number | null;
  durationMs: number | null;
};

/** Stable fields for lobby / SSE (omits progress so payloads don’t churn every tick). */
export type NowPlayingSlim = {
  isPlaying: boolean;
  deviceName: string | null;
  trackName: string | null;
  artistName: string | null;
  durationMs: number | null;
};

export function slimNowPlaying(
  n: NowPlayingPayload | null,
): NowPlayingSlim | null {
  if (!n) return null;
  return {
    isPlaying: n.isPlaying,
    deviceName: n.deviceName,
    trackName: n.trackName,
    artistName: n.artistName,
    durationMs: n.durationMs,
  };
}

const nowPlayingCache = new Map<
  string,
  { at: number; value: NowPlayingPayload | null }
>();
const NOW_PLAYING_CACHE_MS = 4000;

/** Cached snapshot — use for high-frequency callers (e.g. SSE) to respect Spotify rate limits. */
export async function getHostNowPlayingPayloadCached(
  hostUserId: string,
): Promise<NowPlayingPayload | null> {
  const now = Date.now();
  const hit = nowPlayingCache.get(hostUserId);
  if (hit && now - hit.at < NOW_PLAYING_CACHE_MS) {
    return hit.value;
  }
  const value = await getHostNowPlayingPayload(hostUserId);
  nowPlayingCache.set(hostUserId, { at: now, value });
  return value;
}

export async function getHostNowPlayingPayload(
  hostUserId: string,
): Promise<NowPlayingPayload | null> {
  const res = await spotifyUserGet(
    hostUserId,
    "https://api.spotify.com/v1/me/player",
  );
  if (res.status === 204) {
    return {
      isPlaying: false,
      deviceName: null,
      trackName: null,
      artistName: null,
      progressMs: null,
      durationMs: null,
    };
  }
  if (!res.ok) {
    return null;
  }
  const j = (await res.json()) as {
    is_playing?: boolean;
    device?: { name?: string };
    item?: {
      name?: string;
      artists?: { name?: string }[];
      duration_ms?: number;
    };
    progress_ms?: number;
  };
  const item = j.item;
  const artistName =
    item?.artists?.map((a) => a.name).filter(Boolean).join(", ") ?? null;
  return {
    isPlaying: Boolean(j.is_playing),
    deviceName: j.device?.name ?? null,
    trackName: item?.name ?? null,
    artistName,
    progressMs: typeof j.progress_ms === "number" ? j.progress_ms : null,
    durationMs: typeof item?.duration_ms === "number" ? item.duration_ms : null,
  };
}
