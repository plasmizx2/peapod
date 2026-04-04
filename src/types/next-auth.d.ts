import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
    /** True right after sign-in; client runs one Spotify sync then clears via `update()`. */
    triggerSpotifySync?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    triggerSpotifySync?: boolean;
  }
}
