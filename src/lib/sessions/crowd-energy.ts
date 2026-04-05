import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessionMembers, sessionVotes } from "@/db/schema";

export type CrowdEnergyLevel = "low" | "medium" | "high" | "fire";

export type CrowdEnergy = {
  level: CrowdEnergyLevel;
  activeVoters: number;
  recentVotes: number;
  totalVotes: number;
};

/**
 * Computes crowd energy based on voting activity.
 */
export async function computeCrowdEnergy(
  sessionId: string,
): Promise<CrowdEnergy> {
  // Total votes
  const [totalRow] = await db
    .select({ n: count() })
    .from(sessionVotes)
    .where(eq(sessionVotes.sessionId, sessionId));
  const totalVotes = Number(totalRow?.n ?? 0);

  // Unique voters
  const voterRows = await db
    .select({ n: sql<number>`count(distinct ${sessionVotes.userId})`.mapWith(Number) })
    .from(sessionVotes)
    .where(eq(sessionVotes.sessionId, sessionId));
  const activeVoters = voterRows[0]?.n ?? 0;

  // Votes in last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const [recentRow] = await db
    .select({ n: count() })
    .from(sessionVotes)
    .where(
      and(
        eq(sessionVotes.sessionId, sessionId),
        gte(sessionVotes.updatedAt, fiveMinAgo),
      ),
    );
  const recentVotes = Number(recentRow?.n ?? 0);

  // Member count for ratio
  const [memberRow] = await db
    .select({ n: count() })
    .from(sessionMembers)
    .where(eq(sessionMembers.sessionId, sessionId));
  const memberCount = Number(memberRow?.n ?? 0);

  // Compute level
  const voterRatio = memberCount > 0 ? activeVoters / memberCount : 0;
  let level: CrowdEnergyLevel;

  if (recentVotes >= 10 && voterRatio >= 0.7) {
    level = "fire";
  } else if (recentVotes >= 5 && voterRatio >= 0.5) {
    level = "high";
  } else if (recentVotes >= 2 || voterRatio >= 0.3) {
    level = "medium";
  } else {
    level = "low";
  }

  return { level, activeVoters, recentVotes, totalVotes };
}
