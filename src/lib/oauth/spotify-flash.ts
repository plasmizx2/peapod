import { NextResponse } from "next/server";

/** Survives /login redirect when query params would otherwise be dropped. */
export const SPOTIFY_OAUTH_FLASH = "pp_spotify_oauth_flash";

export type SpotifyOauthFlashPayload = {
  code: string;
  desc?: string;
  http?: string;
};

export function encodeSpotifyOauthFlash(p: SpotifyOauthFlashPayload): string {
  return Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
}

export function decodeSpotifyOauthFlash(
  raw: string | undefined,
): SpotifyOauthFlashPayload | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const o = JSON.parse(json) as SpotifyOauthFlashPayload;
    if (o && typeof o.code === "string") return o;
  } catch {
    return null;
  }
  return null;
}

export function applySpotifyOauthFlash(
  res: NextResponse,
  p: SpotifyOauthFlashPayload,
): NextResponse {
  res.cookies.set(SPOTIFY_OAUTH_FLASH, encodeSpotifyOauthFlash(p), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/** Redirect to Music services with URL params + flash cookie (same payload). */
export function redirectToAccountsSpotifyError(
  origin: string,
  fields: SpotifyOauthFlashPayload,
): NextResponse {
  const url = new URL("/dashboard/accounts", origin);
  url.searchParams.set("spotify_error", fields.code);
  if (fields.desc) {
    url.searchParams.set("spotify_error_desc", fields.desc);
  }
  if (fields.http) {
    url.searchParams.set("spotify_http", fields.http);
  }
  const res = NextResponse.redirect(url);
  applySpotifyOauthFlash(res, fields);
  return res;
}
