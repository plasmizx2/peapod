import { getSpotifyAccessToken } from "@/lib/spotify/access-token";

const MAX_429 = 6;

function parseRetryAfterSeconds(res: Response): number | null {
  const raw = res.headers.get("Retry-After");
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Authenticated Spotify Web API GET with 401 refresh + 429 backoff.
 */
export async function spotifyUserGet(
  userId: string,
  url: string,
): Promise<Response> {
  let state = await getSpotifyAccessToken(userId);
  let attempt429 = 0;

  for (;;) {
    let res = await fetch(url, {
      headers: { Authorization: `Bearer ${state.accessToken}` },
    });

    if (res.status === 401) {
      state = await getSpotifyAccessToken(userId, { forceRefresh: true });
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${state.accessToken}` },
      });
    }

    if (res.status === 429) {
      attempt429 += 1;
      if (attempt429 > MAX_429) {
        return res;
      }
      const sec =
        parseRetryAfterSeconds(res) ?? Math.min(90, 2 ** attempt429);
      await sleep(sec * 1000);
      continue;
    }

    return res;
  }
}

/**
 * Authenticated Spotify Web API PUT with JSON body, 401 refresh + 429 backoff.
 */
export async function spotifyUserPut(
  userId: string,
  url: string,
  body: unknown,
): Promise<Response> {
  let state = await getSpotifyAccessToken(userId);
  let attempt429 = 0;

  for (;;) {
    let res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      state = await getSpotifyAccessToken(userId, { forceRefresh: true });
      res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${state.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }

    if (res.status === 429) {
      attempt429 += 1;
      if (attempt429 > MAX_429) {
        return res;
      }
      const sec =
        parseRetryAfterSeconds(res) ?? Math.min(90, 2 ** attempt429);
      await sleep(sec * 1000);
      continue;
    }

    return res;
  }
}

/**
 * Authenticated Spotify Web API POST with JSON body, 401 refresh + 429 backoff.
 */
export async function spotifyUserPost(
  userId: string,
  url: string,
  body: unknown,
): Promise<Response> {
  let state = await getSpotifyAccessToken(userId);
  let attempt429 = 0;

  for (;;) {
    let res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      state = await getSpotifyAccessToken(userId, { forceRefresh: true });
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }

    if (res.status === 429) {
      attempt429 += 1;
      if (attempt429 > MAX_429) {
        return res;
      }
      const sec =
        parseRetryAfterSeconds(res) ?? Math.min(90, 2 ** attempt429);
      await sleep(sec * 1000);
      continue;
    }

    return res;
  }
}
