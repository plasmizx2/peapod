import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listeningEvents, userPatternProfiles } from "@/db/schema";
import { getUserAnalytics } from "@/lib/data/analytics";
import { VisualIdentityPageClient } from "@/components/dashboard/visual-identity-page";
import { ensureUserListeningStats } from "@/lib/data/rebuild-user-stats";
import { getTimePatterns } from "@/lib/data/listening-time-insights";
import { getTopArtists, getTopTracks } from "@/lib/data/listening-insights";
import { detectCurrentPhase } from "@/lib/data/phase-detection";
import { getForgottenFavorites } from "@/lib/data/forgotten-tracks";
import type { TimePatterns } from "@/types/listening";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const uid = session.user.id;

  const [row] = await db
    .select({ n: count() })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, uid));
  const listeningCount = Number(row?.n ?? 0);

  const analyticsStats = await getUserAnalytics(uid);

  let topTracks: Awaited<ReturnType<typeof getTopTracks>> = [];
  let topArtists: Awaited<ReturnType<typeof getTopArtists>> = [];
  let timePatterns: TimePatterns | null = null;
  let vibeLine: string | null = null;
  let phaseInfo: Awaited<ReturnType<typeof detectCurrentPhase>> = null;
  let forgottenTracks: Awaited<ReturnType<typeof getForgottenFavorites>> = [];

  if (listeningCount > 0) {
    await ensureUserListeningStats(uid);
    const [profile] = await db
      .select({ vibeLine: userPatternProfiles.vibeLine })
      .from(userPatternProfiles)
      .where(eq(userPatternProfiles.userId, uid))
      .limit(1);
    vibeLine = profile?.vibeLine ?? null;

    [topTracks, topArtists, timePatterns] = await Promise.all([
      getTopTracks(uid, 5),
      getTopArtists(uid, 5),
      getTimePatterns(uid),
    ]);

    if (listeningCount >= 50) {
      [phaseInfo, forgottenTracks] = await Promise.all([
        detectCurrentPhase(uid),
        getForgottenFavorites(uid, 5),
      ]);
    }
  }

  return (
    <VisualIdentityPageClient
      listeningCount={listeningCount}
      vibeLine={vibeLine}
      phaseInfo={phaseInfo}
      timePatterns={timePatterns}
      topTracks={topTracks}
      topArtists={topArtists}
      forgottenTracks={forgottenTracks}
      analyticsStats={analyticsStats}
    />
  );
}
