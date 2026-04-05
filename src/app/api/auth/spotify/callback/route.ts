import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  providerAccounts,
  providerOauthCredentials,
} from "@/db/schema";
import { oauthAppOrigin } from "@/lib/oauth/app-origin";
import {
  applySpotifyOauthFlash,
  redirectToAccountsSpotifyError,
  SPOTIFY_OAUTH_FLASH,
} from "@/lib/oauth/spotify-flash";

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
  const origin = oauthAppOrigin(request);

  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");
  const authCode = searchParams.get("code");
  const state = searchParams.get("state");

  if (oauthError) {
    const errDesc = searchParams.get("error_description")?.slice(0, 600);
    return redirectToAccountsSpotifyError(origin, {
      code: oauthError,
      desc: errDesc,
    });
  }

  const cookieStore = await cookies();
  const stored = cookieStore.get("pp_spotify_oauth_state")?.value;
  if (!state || !stored || state !== stored) {
    return redirectToAccountsSpotifyError(origin, { code: "invalid_state" });
  }

  if (!authCode) {
    return redirectToAccountsSpotifyError(origin, { code: "missing_code" });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToAccountsSpotifyError(origin, { code: "server_config" });
  }

  const session = await auth();
  if (!session?.user?.id) {
    const login = new URL("/login", origin);
    login.searchParams.set(
      "callbackUrl",
      "/dashboard/accounts?spotify_error=session_expired",
    );
    const res = NextResponse.redirect(login);
    applySpotifyOauthFlash(res, { code: "session_expired" });
    return res;
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
      code: authCode,
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
    let errCode = "token_exchange";
    let errDesc: string | undefined;
    try {
      const j = JSON.parse(errBody) as {
        error?: string;
        error_description?: string;
      };
      if (j.error === "invalid_grant") {
        errCode = "invalid_grant";
      } else if (j.error === "invalid_client") {
        errCode = "invalid_client";
      } else if (j.error === "invalid_redirect_uri") {
        errCode = "invalid_redirect_uri";
      } else if (j.error) {
        errCode = j.error;
      }
      if (j.error_description) {
        errDesc = j.error_description.slice(0, 600);
      }
    } catch {
      /* keep defaults */
    }
    return redirectToAccountsSpotifyError(origin, {
      code: errCode,
      desc: errDesc,
    });
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
    return redirectToAccountsSpotifyError(origin, {
      code: "profile_fetch",
      http: String(meRes.status),
    });
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
    return redirectToAccountsSpotifyError(origin, { code: "db_upsert" });
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
    return redirectToAccountsSpotifyError(origin, { code: "credentials" });
  }

  const successUrl = new URL("/dashboard/accounts", origin);
  successUrl.searchParams.set("spotify", "connected");
  const res = NextResponse.redirect(successUrl);
  res.cookies.set("pp_spotify_oauth_state", "", { maxAge: 0, path: "/" });
  res.cookies.set(SPOTIFY_OAUTH_FLASH, "", { maxAge: 0, path: "/" });
  return res;
}
