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

export type WeekdayBucket = {
  dow: number;
  label: string;
  count: number;
};

/** Clock times derived from stored timestamps (UTC). */
export type TimePatterns = {
  hourlyUtc: number[];
  weekdayUtc: WeekdayBucket[];
  peakHourUtc: number | null;
  peakWeekdayDow: number | null;
};
