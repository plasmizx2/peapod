import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";

export type UserProfile = {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  friendCode: string | null;
  friendCodeUpdatedAt: string | null;
  phoneNumber: string | null;
  listeningVisibility: string;
  sessionHistoryVisible: boolean;
};

/** Generate a random 8-char alphanumeric friend code. */
function generateFriendCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for readability
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const [profile] = await db
    .select({
      displayName: userProfiles.displayName,
      bio: userProfiles.bio,
      avatarUrl: userProfiles.avatarUrl,
      friendCode: userProfiles.friendCode,
      friendCodeUpdatedAt: userProfiles.friendCodeUpdatedAt,
      phoneNumber: userProfiles.phoneNumber,
      listeningVisibility: userProfiles.listeningVisibility,
      sessionHistoryVisible: userProfiles.sessionHistoryVisible,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (profile) {
    if (!profile.friendCode) {
      const code = generateFriendCode();
      await db
        .update(userProfiles)
        .set({ friendCode: code })
        .where(eq(userProfiles.userId, userId));
      profile.friendCode = code;
    }

    return {
      ...profile,
      friendCodeUpdatedAt: profile.friendCodeUpdatedAt?.toISOString() ?? null,
    };
  }

  // Auto-create profile with generated friend code
  const code = generateFriendCode();
  await db
    .insert(userProfiles)
    .values({
      userId,
      friendCode: code,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  return {
    displayName: null,
    bio: null,
    avatarUrl: null,
    friendCode: code,
    friendCodeUpdatedAt: null,
    phoneNumber: null,
    listeningVisibility: "friends_only",
    sessionHistoryVisible: true,
  };
}

/**
 * Check if a friend code is available.
 */
export async function isFriendCodeAvailable(
  code: string,
  excludeUserId?: string,
): Promise<boolean> {
  const normalized = code.toUpperCase().trim();
  const [existing] = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.friendCode, normalized))
    .limit(1);

  if (!existing) return true;
  return excludeUserId ? existing.userId === excludeUserId : false;
}

export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    friendCode?: string;
    phoneNumber?: string;
    listeningVisibility?: string;
    sessionHistoryVisible?: boolean;
  },
): Promise<UserProfile> {
  const now = new Date();

  // Normalize friend code if provided
  const friendCode = data.friendCode?.toUpperCase().trim() || undefined;

  await db
    .insert(userProfiles)
    .values({
      userId,
      displayName: data.displayName ?? null,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      friendCode: friendCode ?? generateFriendCode(),
      friendCodeUpdatedAt: friendCode ? now : null,
      phoneNumber: data.phoneNumber ?? null,
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
        ...(friendCode !== undefined ? { friendCode, friendCodeUpdatedAt: now } : {}),
        ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
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
