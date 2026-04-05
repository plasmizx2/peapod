import { and, asc, eq, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import {
  listeningSessions,
  sessionMembers,
  sessionQueue,
  tracks,
} from "@/db/schema";
import type { SpotifyTrackPayload } from "@/lib/spotify/catalog-track";
import { upsertCatalogTrack } from "@/lib/spotify/catalog-track";
import {
  SpotifyNotLinkedError,
  SpotifyTokenError,
} from "@/lib/spotify/access-token";
import { spotifyUserGet } from "@/lib/spotify/user-api";

const MAX_IMPORT = 200;

/** Extract Spotify playlist id from URL, spotify: URI, or raw id. */
export function parseSpotifyPlaylistId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const fromUri = t.match(/spotify:playlist:([a-zA-Z0-9]+)/i);
  if (fromUri?.[1]) return fromUri[1];
  const fromUrl = t.match(/\/playlist\/([a-zA-Z0-9]+)/i);
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

function interleaveQueueItemIds(a: string[], b: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    out.push(a[i]!);
    i += 1;
    out.push(b[j]!);
    j += 1;
  }
  while (i < a.length) {
    out.push(a[i]!);
    i += 1;
  }
  while (j < b.length) {
    out.push(b[j]!);
    j += 1;
  }
  return out;
}

async function reorderQueuePositions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  sessionId: string,
  orderedIds: string[],
) {
  const OFFSET = 1_000_000;
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(sessionQueue)
      .set({ queuePosition: OFFSET + i })
      .where(
        and(
          eq(sessionQueue.sessionId, sessionId),
          eq(sessionQueue.id, orderedIds[i]!),
        ),
      );
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(sessionQueue)
      .set({ queuePosition: i + 1 })
      .where(
        and(
          eq(sessionQueue.sessionId, sessionId),
          eq(sessionQueue.id, orderedIds[i]!),
        ),
      );
  }
}

export type PlaylistImportOk = {
  ok: true;
  imported: number;
  skippedDuplicates: number;
  scannedFromPlaylist: number;
  interleaved: boolean;
};

export type PlaylistImportFailure =
  | { ok: false; reason: "not_member" | "ended" | "empty" }
  | {
      ok: false;
      reason: "playlist_not_found" | "playlist_forbidden" | "spotify_rate_limited";
    }
  | { ok: false; reason: "spotify_not_linked" | "spotify_token" }
  | { ok: false; reason: "fetch_failed"; httpStatus: number };

/**
 * Merge a Spotify playlist into the session queue (importer's token reads the playlist).
 * Skips tracks already in the **unplayed** queue (by Spotify id). Optional interleave
 * merges new items with existing unplayed rows in round-robin order.
 */
export async function importSpotifyPlaylistIntoSession(
  sessionId: string,
  importerUserId: string,
  spotifyPlaylistId: string,
  options?: { interleave?: boolean },
): Promise<PlaylistImportOk | PlaylistImportFailure> {
  const interleave = Boolean(options?.interleave);

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

  const existingUnplayed = await db
    .select({ spotifyId: tracks.spotifyId })
    .from(sessionQueue)
    .innerJoin(tracks, eq(sessionQueue.trackId, tracks.id))
    .where(
      and(
        eq(sessionQueue.sessionId, sessionId),
        isNull(sessionQueue.playedAt),
      ),
    );

  const existingSpotify = new Set(
    existingUnplayed.map((r) => r.spotifyId),
  );

  const payloads: SpotifyTrackPayload[] = [];
  let skippedDuplicates = 0;
  let scannedFromPlaylist = 0;
  const seenInPlaylist = new Set<string>();

  let url: string | null =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(spotifyPlaylistId)}/tracks?limit=100`;

  while (url && payloads.length < MAX_IMPORT) {
    let res: Response;
    try {
      res = await spotifyUserGet(importerUserId, url);
    } catch (e) {
      if (e instanceof SpotifyNotLinkedError) {
        return { ok: false, reason: "spotify_not_linked" };
      }
      if (e instanceof SpotifyTokenError) {
        return { ok: false, reason: "spotify_token" };
      }
      throw e;
    }
    if (!res.ok) {
      const status = res.status;
      if (status === 404) {
        return { ok: false, reason: "playlist_not_found" };
      }
      if (status === 403) {
        return { ok: false, reason: "playlist_forbidden" };
      }
      if (status === 429) {
        return { ok: false, reason: "spotify_rate_limited" };
      }
      return { ok: false, reason: "fetch_failed", httpStatus: status };
    }
    const json = (await res.json()) as PlaylistTracksJson;
    const items = json.items ?? [];
    for (const it of items) {
      const tr = it.track;
      if (!tr?.id || !tr.name || !tr.artists?.length) continue;
      const t = tr as SpotifyTrackPayload & { type?: string };
      if (t.type && t.type !== "track") continue;
      scannedFromPlaylist += 1;
      if (existingSpotify.has(tr.id)) {
        skippedDuplicates += 1;
        continue;
      }
      if (seenInPlaylist.has(tr.id)) {
        skippedDuplicates += 1;
        continue;
      }
      seenInPlaylist.add(tr.id);
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
    if (scannedFromPlaylist === 0) {
      return { ok: false, reason: "empty" };
    }
    return {
      ok: true,
      imported: 0,
      skippedDuplicates,
      scannedFromPlaylist,
      interleaved: false,
    };
  }

  const trackIds: string[] = [];
  for (const p of payloads) {
    const tid = await upsertCatalogTrack(p);
    if (tid) trackIds.push(tid);
  }

  if (trackIds.length === 0) {
    return { ok: false, reason: "empty" };
  }

  if (!interleave) {
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

    return {
      ok: true,
      imported: trackIds.length,
      skippedDuplicates,
      scannedFromPlaylist,
      interleaved: false,
    };
  }

  await db.transaction(async (tx) => {
    const allRows = await tx
      .select({
        id: sessionQueue.id,
        playedAt: sessionQueue.playedAt,
      })
      .from(sessionQueue)
      .where(eq(sessionQueue.sessionId, sessionId))
      .orderBy(asc(sessionQueue.queuePosition));

    const playedIds = allRows
      .filter((r) => r.playedAt != null)
      .map((r) => r.id);
    const unplayedIds = allRows
      .filter((r) => r.playedAt == null)
      .map((r) => r.id);

    const TEMP_BASE = 3_000_000;
    const newQueueIds: string[] = [];
    for (let i = 0; i < trackIds.length; i++) {
      const [row] = await tx
        .insert(sessionQueue)
        .values({
          sessionId,
          trackId: trackIds[i]!,
          queuePosition: TEMP_BASE + i,
          sourceType: "playlist_import",
          addedByUserId: importerUserId,
        })
        .returning({ id: sessionQueue.id });
      if (row) {
        newQueueIds.push(row.id);
      }
    }

    const tailMerged = interleaveQueueItemIds(unplayedIds, newQueueIds);
    const fullOrder = [...playedIds, ...tailMerged];
    await reorderQueuePositions(tx, sessionId, fullOrder);
  });

  return {
    ok: true,
    imported: trackIds.length,
    skippedDuplicates,
    scannedFromPlaylist,
    interleaved: true,
  };
}
