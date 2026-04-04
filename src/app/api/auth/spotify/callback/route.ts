import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  providerAccounts,
  providerOauthCredentials,
} from "@/db/schema";

function appOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}

type SpotifyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

type SpotifyUser = {
  id: string;
};

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const accountsUrl = new URL("/dashboard/accounts", origin);

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    accountsUrl.searchParams.set("spotify_error", error);
    return NextResponse.redirect(accountsUrl);
  }

  const cookieStore = await cookies();
  const stored = cookieStore.get("pp_spotify_oauth_state")?.value;
  if (!state || !stored || state !== stored) {
    accountsUrl.searchParams.set("spotify_error", "invalid_state");
    return NextResponse.redirect(accountsUrl);
  }

  if (!code) {
    accountsUrl.searchParams.set("spotify_error", "missing_code");
    return NextResponse.redirect(accountsUrl);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    accountsUrl.searchParams.set("spotify_error", "server_config");
    return NextResponse.redirect(accountsUrl);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const redirectUri = `${origin}/api/auth/spotify/callback`;
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error(
      "[spotify/callback] token exchange failed",
      tokenRes.status,
      errBody.slice(0, 800),
    );
    accountsUrl.searchParams.set("spotify_error", "token_exchange");
    return NextResponse.redirect(accountsUrl);
  }

  const tokens = (await tokenRes.json()) as SpotifyTokenResponse;

  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meRes.ok) {
    const errBody = await meRes.text();
    console.error(
      "[spotify/callback] GET /v1/me failed",
      meRes.status,
      errBody.slice(0, 800),
    );
    accountsUrl.searchParams.set("spotify_error", "profile_fetch");
    accountsUrl.searchParams.set("spotify_http", String(meRes.status));
    return NextResponse.redirect(accountsUrl);
  }

  const spotifyUser = (await meRes.json()) as SpotifyUser;

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const [account] = await db
    .insert(providerAccounts)
    .values({
      userId: session.user.id,
      providerName: "spotify",
      providerUserId: spotifyUser.id,
      accountStatus: "linked",
      lastSyncedAt: null,
    })
    .onConflictDoUpdate({
      target: [providerAccounts.userId, providerAccounts.providerName],
      set: {
        providerUserId: spotifyUser.id,
        accountStatus: "linked",
        updatedAt: new Date(),
      },
    })
    .returning({ id: providerAccounts.id });

  if (!account) {
    accountsUrl.searchParams.set("spotify_error", "db_upsert");
    return NextResponse.redirect(accountsUrl);
  }

  let refreshToken = tokens.refresh_token ?? null;
  if (!refreshToken) {
    const [existing] = await db
      .select({ refreshToken: providerOauthCredentials.refreshToken })
      .from(providerOauthCredentials)
      .where(eq(providerOauthCredentials.providerAccountId, account.id))
      .limit(1);
    refreshToken = existing?.refreshToken ?? null;
  }

  try {
    await db
      .insert(providerOauthCredentials)
      .values({
        providerAccountId: account.id,
        accessToken: tokens.access_token,
        refreshToken,
        tokenExpiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: providerOauthCredentials.providerAccountId,
        set: {
          accessToken: tokens.access_token,
          refreshToken,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });
  } catch {
    accountsUrl.searchParams.set("spotify_error", "credentials");
    return NextResponse.redirect(accountsUrl);
  }

  const successUrl = new URL("/dashboard/accounts", origin);
  successUrl.searchParams.set("spotify", "connected");
  const res = NextResponse.redirect(successUrl);
  res.cookies.set("pp_spotify_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
