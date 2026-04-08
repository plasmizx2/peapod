/** Solo / chatbot / group / party_fill playlist generation — expand in Phase 4+. */
export type PlaylistSourceType = "solo" | "chatbot" | "group" | "party_fill";

export type GeneratedPlaylistSummary = {
  id: string;
  title: string;
  source_type: PlaylistSourceType;
  created_at: string;
};

export type GeneratedPlaylistTrackClient = {
  position: number;
  trackName: string;
  artistName: string;
  score: number;
  spotifyId: string;
  isDiscovery: boolean;
};

export type GeneratePlaylistResponse = {
  ok: true;
  playlistId: string;
  title: string;
  moodEngine: "gemini" | "preset" | null;
  tracks: GeneratedPlaylistTrackClient[];
};
