import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import {
  listeningSessions,
  sessionMembers,
  sessionQueue,
} from "@/db/schema";
import type { SpotifyTrackPayload } from "@/lib/spotify/catalog-track";
import { upsertCatalogTrack } from "@/lib/spotify/catalog-track";
import { spotifyUserGet } from "@/lib/spotify/user-api";

const MAX_IMPORT = 200;

/** Extract Spotify playlist id from URL or raw id. */
export function parseSpotifyPlaylistId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const fromUrl = t.match(/playlist\/([a-zA-Z0-9]+)/);
  if (fromUrl?.[1]) return fromUrl[1];
  if (/^[a-zA-Z0-9]{10,}$/.test(t)) return t;
  return null;
}

type PlaylistTracksJson = {
  items?: {
    track: SpotifyTrackPayload | null;
  }[];
  next?: string | null;
};

/**
 * Merge a Spotify playlist into the session queue (importer's token reads the playlist).
 */
export async function importSpotifyPlaylistIntoSession(
  sessionId: string,
  importerUserId: string,
  spotifyPlaylistId: string,
): Promise<
  | { ok: true; imported: number }
  | {
      ok: false;
      reason:
        | "not_member"
        | "ended"
        | "fetch_failed"
        | "empty";
    }
> {
  const [mem] = await db
    .select({ sessionId: sessionMembers.sessionId })
    .from(sessionMembers)
    .where(
      and(
        eq(sessionMembers.sessionId, sessionId),
        eq(sessionMembers.userId, importerUserId),
      ),
    )
    .limit(1);

  if (!mem) {
    return { ok: false, reason: "not_member" };
  }

  const [session] = await db
    .select({ status: listeningSessions.status })
    .from(listeningSessions)
    .where(eq(listeningSessions.id, sessionId))
    .limit(1);

  if (!session || session.status !== "active") {
    return { ok: false, reason: "ended" };
  }

  const payloads: SpotifyTrackPayload[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(spotifyPlaylistId)}/tracks?limit=100`;

  while (url && payloads.length < MAX_IMPORT) {
    const res = await spotifyUserGet(importerUserId, url);
    if (!res.ok) {
      return { ok: false, reason: "fetch_failed" };
    }
    const json = (await res.json()) as PlaylistTracksJson;
    const items = json.items ?? [];
    for (const it of items) {
      const tr = it.track;
      if (!tr?.id || !tr.name || !tr.artists?.length) continue;
      const t = tr as SpotifyTrackPayload & { type?: string };
      if (t.type && t.type !== "track") continue;
      payloads.push(tr);
      if (payloads.length >= MAX_IMPORT) break;
    }
    const next = json.next;
    url =
      payloads.length >= MAX_IMPORT
        ? null
        : typeof next === "string" && next
          ? next
          : null;
  }

  if (payloads.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const trackIds: string[] = [];
  for (const p of payloads) {
    const tid = await upsertCatalogTrack(p);
    if (tid) trackIds.push(tid);
  }

  if (trackIds.length === 0) {
    return { ok: false, reason: "empty" };
  }

  await db.transaction(async (tx) => {
    const [agg] = await tx
      .select({ m: max(sessionQueue.queuePosition) })
      .from(sessionQueue)
      .where(eq(sessionQueue.sessionId, sessionId));

    let pos = (agg?.m ?? 0) + 1;
    for (const trackId of trackIds) {
      await tx.insert(sessionQueue).values({
        sessionId,
        trackId,
        queuePosition: pos,
        sourceType: "playlist_import",
        addedByUserId: importerUserId,
      });
      pos += 1;
    }
  });

  return { ok: true, imported: trackIds.length };
}
