"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

/**
 * After sign-in, runs POST /api/spotify/sync once (if Spotify is linked),
 * then clears `triggerSpotifySync` on the JWT so it does not repeat until next login.
 */
export function PostLoginSpotifySync() {
  const { data: session, status, update } = useSession();
  const working = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.triggerSpotifySync) {
      return;
    }
    if (working.current) {
      return;
    }
    working.current = true;

    (async () => {
      try {
        await fetch("/api/spotify/sync", { method: "POST" });
      } catch {
        /* ignore network errors */
      } finally {
        working.current = false;
        await update({ clearSpotifySyncTrigger: true });
      }
    })();
  }, [status, session?.triggerSpotifySync, update]);

  return null;
}
