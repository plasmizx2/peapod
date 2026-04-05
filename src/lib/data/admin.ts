import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, providerAccounts, listeningEvents } from "@/db/schema";
import { auth } from "@/auth";

const ADMIN_EMAILS = ["seandumont2005@gmail.com"];

/**
 * Check if the current session user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user?.role === "admin";
}

/**
 * Check by email (used for bootstrapping).
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  onboardingCompleted: boolean;
  createdAt: string;
  providerCount: number;
  listeningCount: number;
};

/**
 * Get all users with aggregate stats (admin only).
 */
export async function getAllUsers(): Promise<AdminUserRow[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      onboardingCompleted: users.onboardingCompleted,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Batch fetch provider counts and listening counts
  const providerCounts = await db
    .select({
      userId: providerAccounts.userId,
      n: count(),
    })
    .from(providerAccounts)
    .groupBy(providerAccounts.userId);

  const listenCounts = await db
    .select({
      userId: listeningEvents.userId,
      n: count(),
    })
    .from(listeningEvents)
    .groupBy(listeningEvents.userId);

  const provMap = new Map(providerCounts.map((r) => [r.userId, Number(r.n)]));
  const listenMap = new Map(listenCounts.map((r) => [r.userId, Number(r.n)]));

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    onboardingCompleted: r.onboardingCompleted,
    createdAt: r.createdAt?.toISOString() ?? "",
    providerCount: provMap.get(r.id) ?? 0,
    listeningCount: listenMap.get(r.id) ?? 0,
  }));
}
