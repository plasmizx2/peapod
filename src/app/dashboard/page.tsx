import { count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listeningEvents, userPatternProfiles } from "@/db/schema";
import { FigmaDashboardHome } from "@/components/dashboard/figma-dashboard-home";
import { ensureUserListeningStats } from "@/lib/data/rebuild-user-stats";
import { getTimePatterns } from "@/lib/data/listening-time-insights";
import {
  getRecentPlays,
  getTopArtists,
  getTopTracks,
} from "@/lib/data/listening-insights";
import { detectCurrentPhase } from "@/lib/data/phase-detection";
import { getForgottenFavorites } from "@/lib/data/forgotten-tracks";
import { getSongOfTheDay } from "@/lib/data/song-of-the-day";
import type { TimePatterns } from "@/types/listening";

export default async function DashboardHomePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const name =
    session?.user?.name ?? (email ? email.split("@")[0] : "there");
  const firstName = name.split("@")[0];

  let listeningCount = 0;
  let recentPlays: Awaited<ReturnType<typeof getRecentPlays>> = [];
  let topTracks: Awaited<ReturnType<typeof getTopTracks>> = [];
  let topArtists: Awaited<ReturnType<typeof getTopArtists>> = [];
  let timePatterns: TimePatterns | null = null;
  let vibeLine: string | null = null;
  let phaseInfo: Awaited<ReturnType<typeof detectCurrentPhase>> = null;
  let forgottenTracks: Awaited<ReturnType<typeof getForgottenFavorites>> = [];
  let songOfDay: Awaited<ReturnType<typeof getSongOfTheDay>> = null;

  if (session?.user?.id) {
    const uid = session.user.id;
    const [row] = await db
      .select({ n: count() })
      .from(listeningEvents)
      .where(eq(listeningEvents.userId, uid));
    listeningCount = Number(row?.n ?? 0);

    if (listeningCount > 0) {
      await ensureUserListeningStats(uid);
      const [profile] = await db
        .select({ vibeLine: userPatternProfiles.vibeLine })
        .from(userPatternProfiles)
        .where(eq(userPatternProfiles.userId, uid))
        .limit(1);
      vibeLine = profile?.vibeLine ?? null;

      [recentPlays, topTracks, topArtists, timePatterns] = await Promise.all([
        getRecentPlays(uid, 15),
        getTopTracks(uid, 5),
        getTopArtists(uid, 5),
        getTimePatterns(uid),
      ]);

      // Phase detection and forgotten favorites (need decent data)
      if (listeningCount >= 50) {
        [phaseInfo, forgottenTracks, songOfDay] = await Promise.all([
          detectCurrentPhase(uid),
          getForgottenFavorites(uid, 5),
          getSongOfTheDay(uid),
        ]);
      } else if (listeningCount > 0) {
        songOfDay = await getSongOfTheDay(uid);
      }
    }
  }

  return (
    <FigmaDashboardHome
      firstName={firstName}
      listeningCount={listeningCount}
      recentPlays={recentPlays}
      topTracks={topTracks}
      topArtists={topArtists}
      timePatterns={timePatterns}
      vibeLine={vibeLine}
      phaseInfo={phaseInfo}
      forgottenTracks={forgottenTracks}
      songOfDay={songOfDay}
    />
  );
}

