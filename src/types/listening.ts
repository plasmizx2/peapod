export type RecentPlay = {
  trackName: string;
  artistName: string;
  albumName: string | null;
  listenedAtIso: string;
};

export type TopTrack = {
  trackName: string;
  artistName: string;
  plays: number;
};

export type TopArtist = {
  artistName: string;
  plays: number;
};
