export type MusicProviderId = "spotify" | "apple_music";

export type ProviderAccountStatus = "linked" | "revoked" | "error";

/** Matches `provider_accounts` rows from Drizzle (camelCase). */
export type ProviderAccountRow = {
  id: string;
  userId: string;
  providerName: MusicProviderId;
  providerUserId: string;
  accountStatus: ProviderAccountStatus;
  lastSyncedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};
