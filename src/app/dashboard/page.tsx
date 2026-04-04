import { count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listeningEvents } from "@/db/schema";
import { FigmaDashboardHome } from "@/components/dashboard/figma-dashboard-home";
import {
  getRecentPlays,
  getTopArtists,
  getTopTracks,
} from "@/lib/data/listening-insights";

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

  if (session?.user?.id) {
    const uid = session.user.id;
    const [row] = await db
      .select({ n: count() })
      .from(listeningEvents)
      .where(eq(listeningEvents.userId, uid));
    listeningCount = Number(row?.n ?? 0);

    if (listeningCount > 0) {
      [recentPlays, topTracks, topArtists] = await Promise.all([
        getRecentPlays(uid, 15),
        getTopTracks(uid, 5),
        getTopArtists(uid, 5),
      ]);
    }
  }

  return (
    <FigmaDashboardHome
      firstName={firstName}
      listeningCount={listeningCount}
      recentPlays={recentPlays}
      topTracks={topTracks}
      topArtists={topArtists}
    />
  );
}
