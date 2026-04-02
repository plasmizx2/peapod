export type MusicProviderId = "spotify" | "apple_music";

export type ProviderAccountStatus = "linked" | "revoked" | "error";

export type ProviderAccountRow = {
  id: string;
  user_id: string;
  provider_name: MusicProviderId;
  provider_user_id: string;
  account_status: ProviderAccountStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};
