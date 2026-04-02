import type { MusicProviderId } from "@/types/providers";

/** Unified operations implemented per streaming provider (Spotify, Apple Music, …). */
export interface MusicProvider {
  readonly id: MusicProviderId;
  /** Human-readable label for settings UI */
  readonly displayName: string;
}
