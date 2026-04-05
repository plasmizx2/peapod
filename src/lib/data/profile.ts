import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";

export type UserProfile = {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  listeningVisibility: string;
  sessionHistoryVisible: boolean;
};

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const [profile] = await db
    .select({
      displayName: userProfiles.displayName,
      bio: userProfiles.bio,
      avatarUrl: userProfiles.avatarUrl,
      listeningVisibility: userProfiles.listeningVisibility,
      sessionHistoryVisible: userProfiles.sessionHistoryVisible,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return profile ?? {
    displayName: null,
    bio: null,
    avatarUrl: null,
    listeningVisibility: "friends_only",
    sessionHistoryVisible: true,
  };
}

export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    listeningVisibility?: string;
    sessionHistoryVisible?: boolean;
  },
): Promise<UserProfile> {
  const now = new Date();

  await db
    .insert(userProfiles)
    .values({
      userId,
      displayName: data.displayName ?? null,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      listeningVisibility: data.listeningVisibility ?? "friends_only",
      sessionHistoryVisible: data.sessionHistoryVisible ?? true,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        ...(data.listeningVisibility !== undefined
          ? { listeningVisibility: data.listeningVisibility }
          : {}),
        ...(data.sessionHistoryVisible !== undefined
          ? { sessionHistoryVisible: data.sessionHistoryVisible }
          : {}),
        updatedAt: now,
      },
    });

  return getUserProfile(userId);
}
