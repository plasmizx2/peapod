/** Solo / chatbot / group / party_fill playlist generation — expand in Phase 4+. */
export type PlaylistSourceType = "solo" | "chatbot" | "group" | "party_fill";

export type GeneratedPlaylistSummary = {
  id: string;
  title: string;
  source_type: PlaylistSourceType;
  created_at: string;
};
