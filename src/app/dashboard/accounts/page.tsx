import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ProviderAccountRow } from "@/types/providers";

export default async function LinkedAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string; spotify_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;

  const { data: rows } = await supabase
    .from("provider_accounts")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  const accounts = (rows ?? []) as ProviderAccountRow[];
  const spotify = accounts.find((a) => a.provider_name === "spotify");
  const apple = accounts.find((a) => a.provider_name === "apple_music");

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Linked accounts</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Connect streaming providers so PeaPod can learn your patterns. Tokens stay
          on the server — never exposed to the browser.
        </p>
      </div>

      {params.spotify === "connected" ? (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          Spotify connected successfully.
        </p>
      ) : null}
      {params.spotify_error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          Could not connect Spotify ({params.spotify_error}). Try again.
        </p>
      ) : null}

      <ul className="space-y-4">
        <li className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-medium">Spotify</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {spotify
                  ? `Linked · provider user ${spotify.provider_user_id}`
                  : "Not connected"}
              </p>
            </div>
            <Link
              href="/api/auth/spotify"
              className="rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-medium text-black hover:opacity-90"
            >
              {spotify ? "Reconnect" : "Connect Spotify"}
            </Link>
          </div>
        </li>

        <li className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-medium">Apple Music</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {apple
                  ? `Linked · ${apple.provider_user_id}`
                  : "Structure ready — MusicKit + developer token flow in Phase 1 polish."}
              </p>
            </div>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-500"
            >
              Coming soon
            </button>
          </div>
        </li>
      </ul>
    </div>
  );
}
