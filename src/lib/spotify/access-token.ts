import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  providerAccounts,
  providerOauthCredentials,
} from "@/db/schema";

const REFRESH_MARGIN_MS = 60_000;

export class SpotifyNotLinkedError extends Error {
  name = "SpotifyNotLinkedError";
}

export class SpotifyTokenError extends Error {
  name = "SpotifyTokenError";
}

/**
 * Returns a valid Spotify access token for the user's linked account,
 * refreshing with the refresh token when close to expiry.
 */
export async function getSpotifyAccessToken(
  userId: string,
  opts?: { forceRefresh?: boolean },
): Promise<{
  accessToken: string;
  providerAccountId: string;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new SpotifyTokenError("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not configured");
  }

  const [account] = await db
    .select({ id: providerAccounts.id })
    .from(providerAccounts)
    .where(
      and(
        eq(providerAccounts.userId, userId),
        eq(providerAccounts.providerName, "spotify"),
      ),
    )
    .limit(1);

  if (!account) {
    throw new SpotifyNotLinkedError();
  }

  const [creds] = await db
    .select()
    .from(providerOauthCredentials)
    .where(eq(providerOauthCredentials.providerAccountId, account.id))
    .limit(1);

  if (!creds) {
    throw new SpotifyTokenError("Missing OAuth credentials for Spotify");
  }

  const now = Date.now();
  const expiresAt = creds.tokenExpiresAt?.getTime() ?? 0;
  if (
    !opts?.forceRefresh &&
    expiresAt > now + REFRESH_MARGIN_MS
  ) {
    return { accessToken: creds.accessToken, providerAccountId: account.id };
  }

  if (!creds.refreshToken) {
    throw new SpotifyTokenError("No refresh token; reconnect Spotify");
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
    }),
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    console.error("[spotify] refresh failed", tokenRes.status, t.slice(0, 500));
    throw new SpotifyTokenError("Could not refresh Spotify token");
  }

  const json = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const newExpires = new Date(now + json.expires_in * 1000);
  const newRefresh = json.refresh_token ?? creds.refreshToken;

  await db
    .update(providerOauthCredentials)
    .set({
      accessToken: json.access_token,
      refreshToken: newRefresh,
      tokenExpiresAt: newExpires,
      updatedAt: new Date(),
    })
    .where(eq(providerOauthCredentials.providerAccountId, account.id));

  return { accessToken: json.access_token, providerAccountId: account.id };
}
