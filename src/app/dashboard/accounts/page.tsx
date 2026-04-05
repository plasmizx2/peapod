import Link from "next/link";
import { cookies } from "next/headers";
import { count, eq } from "drizzle-orm";
import { Music } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { listeningEvents, providerAccounts } from "@/db/schema";
import { SpotifySyncButton } from "@/components/dashboard/spotify-sync-button";
import {
  decodeSpotifyOauthFlash,
  SPOTIFY_OAUTH_FLASH,
} from "@/lib/oauth/spotify-flash";
import type { ProviderAccountRow } from "@/types/providers";

function firstSearchParam(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" && s.length > 0 ? s : undefined;
}

function spotifyConnectionHelp(
  code: string,
  httpStatus?: string | null,
  description?: string | null,
): string {
  const messages: Record<string, string> = {
    access_denied: "Sign-in cancelled. Try again anytime.",
    invalid_state:
      "The login step expired (cookie or timing). Close other tabs, open Music services again, and tap Reconnect — complete Spotify within a few minutes.",
    missing_code: "Couldn’t finish. Try connecting again.",
    server_config:
      "Server is missing Spotify client id/secret. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in hosting env.",
    token_exchange:
      "Spotify didn’t accept the login code. Try Reconnect again; if it keeps failing, check that your Spotify app’s Redirect URI exactly matches this site’s callback URL.",
    invalid_grant:
      "That login code was already used or expired. Go back to Music services and tap Reconnect again (don’t refresh the Spotify callback page).",
    invalid_client:
      "Spotify rejected the app credentials (client id/secret). Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your hosting environment match the Spotify Developer Dashboard.",
    invalid_redirect_uri:
      "Redirect URI mismatch. In the Spotify Developer Dashboard, add exactly: https://YOUR_SITE/api/auth/spotify/callback (same scheme/host as NEXT_PUBLIC_SITE_URL or your live URL).",
    invalid_scope:
      "Spotify rejected one or more permission names (often a typo in code). If you just deployed a fix, try Reconnect again. Otherwise check the app’s scope list matches Spotify’s docs: developer.spotify.com/documentation/web-api/concepts/scopes",
    db_upsert:
      "Couldn’t save your Spotify link in our database. Try again; if it persists, contact support.",
    credentials: "Couldn’t save tokens. Try Reconnect again.",
    session_expired:
      "Your PeaPod session ended before Spotify finished. Sign in again, then go to Music services and tap Reconnect.",
    profile_fetch:
      "Couldn’t load your Spotify profile from Spotify’s API. If the app is in Development mode, add your Spotify login under Dashboard → your app → User Management. Otherwise wait a few minutes after upgrading Premium, then try Reconnect.",
  };
  const base =
    messages[code] ??
    (code
      ? `Spotify / OAuth returned “${code}”. See details below if any, then try Reconnect.`
      : "Missing error code — try Music services → Reconnect again. If this persists, redeploy the app and check Render logs for [spotify/callback].");
  let out = base;
  if (code === "profile_fetch" && httpStatus === "403") {
    out = `${base} (HTTP 403 — often a Development mode / allowed-user issue.)`;
  } else if (code === "profile_fetch" && httpStatus === "401") {
    out = `${base} (HTTP 401 — token rejected; try Reconnect.)`;
  }
  if (description?.trim()) {
    out = `${out} Details: ${description.trim()}`;
  }
  return out;
}

export default async function LinkedAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    spotify?: string;
    spotify_error?: string;
    spotify_http?: string;
    spotify_error_desc?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const params = await searchParams;

  const cookieStore = await cookies();
  const flash = decodeSpotifyOauthFlash(
    cookieStore.get(SPOTIFY_OAUTH_FLASH)?.value,
  );
  const spotifyError =
    firstSearchParam(params.spotify_error) ?? flash?.code ?? "";
  const spotifyHttp =
    firstSearchParam(params.spotify_http) ?? flash?.http ?? null;
  const spotifyErrorDesc =
    firstSearchParam(params.spotify_error_desc) ?? flash?.desc ?? null;

  const rows = await db
    .select()
    .from(providerAccounts)
    .where(eq(providerAccounts.userId, session.user.id));

  const accounts = rows as ProviderAccountRow[];
  const spotify = accounts.find((a) => a.providerName === "spotify");
  const apple = accounts.find((a) => a.providerName === "apple_music");

  const [listenRow] = await db
    .select({ n: count() })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, session.user.id));
  const listeningCount = Number(listenRow?.n ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-forest-dark sm:text-5xl">
          Music services
        </h1>
        <p className="mt-3 text-base text-moss sm:text-lg">
          Link your streaming. Your Spotify sign-in stays on our servers — not in
          your browser.
        </p>
      </div>

      {params.spotify === "connected" ? (
        <p className="rounded-2xl border border-sage/30 bg-sage/10 px-5 py-4 text-sm text-forest-dark">
          Spotify connected.
        </p>
      ) : null}
      {spotifyError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {spotifyConnectionHelp(
            spotifyError,
            spotifyHttp,
            spotifyErrorDesc,
          )}
        </p>
      ) : null}

      <div className="relative overflow-hidden rounded-3xl border border-forest/10 bg-cream p-8 shadow-2xl sm:p-10">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(29, 185, 84, 0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-3xl bg-[#1DB954]/10 shadow-lg">
            <Music className="h-10 w-10 text-[#1DB954]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-2xl font-semibold text-forest-dark sm:text-3xl">
              Spotify
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-moss sm:text-base">
              {spotify
                ? "Connected — we can read your listening activity where you’ve allowed it."
                : "Not connected yet. Connect to sync your taste."}
            </p>
            <div className="flex flex-col gap-4">
              <Link
                href={
                  spotify
                    ? "/api/auth/spotify?reconnect=1"
                    : "/api/auth/spotify"
                }
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#1DB954] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[#1ed760]"
              >
                {spotify ? "Reconnect" : "Connect Spotify"}
              </Link>
              {spotify ? (
                <div className="space-y-3 rounded-2xl border border-forest/10 bg-white/60 p-4">
                  <p className="text-sm text-moss">
                    <span className="font-medium text-forest-dark">
                      {listeningCount.toLocaleString()}
                    </span>{" "}
                    plays stored
                    {spotify.lastSyncedAt
                      ? ` · Last sync ${spotify.lastSyncedAt.toLocaleString()}`
                      : " · Not synced yet"}
                  </p>
                  <SpotifySyncButton />
                  <p className="text-xs text-moss">
                    We also run this once automatically after each sign-in (when
                    Spotify is linked). Manual sync walks history with pagination
                    (up to ~1,250 plays per run); duplicates are skipped.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-forest/10 bg-cream/80 p-8 opacity-95 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-3xl bg-moss/10">
            <Music className="h-10 w-10 text-moss" />
          </div>
          <div>
            <h2 className="mb-2 flex flex-wrap items-center gap-3 text-2xl font-semibold text-forest-dark sm:text-3xl">
              Apple Music
              <span className="rounded-full bg-moss/20 px-3 py-1 text-xs font-medium text-moss">
                Coming soon
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-moss sm:text-base">
              {apple
                ? "Connected where supported."
                : "We’re still building Apple Music support. Spotify first."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-sage/30 bg-sage/10 p-8">
        <h3 className="mb-3 text-lg font-semibold text-forest-dark">
          What we use your data for
        </h3>
        <p className="text-sm leading-relaxed text-moss">
          Timestamps, plays, skips — the boring stuff that shows habits. No
          selling your taste to advertisers.
        </p>
      </div>
    </div>
  );
}
