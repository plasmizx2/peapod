import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listeningEvents, userPatternProfiles, users } from "@/db/schema";
import { getUserAnalytics } from "@/lib/data/analytics";
import { VisualIdentityPageClient } from "@/components/dashboard/visual-identity-page";
import { ensureUserListeningStats } from "@/lib/data/rebuild-user-stats";
import { getTimePatterns } from "@/lib/data/listening-time-insights";
import { getTopArtists, getTopTracks } from "@/lib/data/listening-insights";
import { detectCurrentPhase } from "@/lib/data/phase-detection";
import { getForgottenFavorites } from "@/lib/data/forgotten-tracks";
import type { TimePatterns } from "@/types/listening";

export default async function FriendIdentityPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const targetUserId = params.id;

  // Retrieve Target User Info
  const [targetUserRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!targetUserRow) {
    redirect("/dashboard/friends"); // User not found
  }

  const rawName = targetUserRow.name || "A friend";
  const firstName = rawName.split(" ")[0];

  const [row] = await db
    .select({ n: count() })
    .from(listeningEvents)
    .where(eq(listeningEvents.userId, targetUserId));
  const listeningCount = Number(row?.n ?? 0);

  const analyticsStats = await getUserAnalytics(targetUserId);

  let topTracks: Awaited<ReturnType<typeof getTopTracks>> = [];
  let topArtists: Awaited<ReturnType<typeof getTopArtists>> = [];
  let timePatterns: TimePatterns | null = null;
  let vibeLine: string | null = null;
  let phaseInfo: Awaited<ReturnType<typeof detectCurrentPhase>> = null;
  let forgottenTracks: Awaited<ReturnType<typeof getForgottenFavorites>> = [];

  if (listeningCount > 0) {
    // Only rebuild stats if needed
    await ensureUserListeningStats(targetUserId);

    const [profile] = await db
      .select({ vibeLine: userPatternProfiles.vibeLine })
      .from(userPatternProfiles)
      .where(eq(userPatternProfiles.userId, targetUserId))
      .limit(1);
    vibeLine = profile?.vibeLine ?? null;

    [topTracks, topArtists, timePatterns] = await Promise.all([
      getTopTracks(targetUserId, 5),
      getTopArtists(targetUserId, 5),
      getTimePatterns(targetUserId),
    ]);

    if (listeningCount >= 50) {
      [phaseInfo, forgottenTracks] = await Promise.all([
        detectCurrentPhase(targetUserId),
        getForgottenFavorites(targetUserId, 5),
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
      userFirstName={firstName}
    />
  );
}
