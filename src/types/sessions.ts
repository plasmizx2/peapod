/** Group sync + party voting — expand in Phase 6+. */
export type SessionType = "group" | "party";

export type SessionMode =
  | "equal_play"
  | "lean_toward_driver"
  | "most_hype_wins";

export type SessionStatus = "lobby" | "active" | "ended";
