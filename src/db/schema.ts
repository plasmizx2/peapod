import {
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  /** Null when the account was created via OAuth only. */
  passwordHash: text("password_hash"),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const providerAccounts = pgTable(
  "provider_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerName: text("provider_name").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    accountStatus: text("account_status").notNull().default("linked"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("provider_accounts_user_provider_idx").on(
      t.userId,
      t.providerName,
    ),
  ],
);

export const providerOauthCredentials = pgTable(
  "provider_oauth_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerAccountId: uuid("provider_account_id")
      .notNull()
      .references(() => providerAccounts.id, { onDelete: "cascade" })
      .unique(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
);

/** Normalized Spotify catalog (Phase 2). */
export const artists = pgTable(
  "artists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spotifyId: text("spotify_id").notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
);

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spotifyId: text("spotify_id").notNull().unique(),
    name: text("name").notNull(),
    albumName: text("album_name"),
    primaryArtistId: uuid("primary_artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
);

export const listeningEvents = pgTable(
  "listening_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: uuid("provider_account_id")
      .notNull()
      .references(() => providerAccounts.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    listenedAt: timestamp("listened_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("listening_events_user_time_track_idx").on(
      t.userId,
      t.listenedAt,
      t.trackId,
    ),
    index("listening_events_user_listened_idx").on(t.userId, t.listenedAt),
  ],
);

/** Spotify sync runs (audit + debugging). */
export const syncJobs = pgTable(
  "sync_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("spotify_recently_played"),
    status: text("status").notNull(),
    imported: integer("imported").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    pagesFetched: integer("pages_fetched").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("sync_jobs_user_started_idx").on(t.userId, t.startedAt)],
);

/** Per-user track play aggregates (Phase 3). */
export const userTrackStats = pgTable(
  "user_track_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    playCount: integer("play_count").notNull(),
    lastListenedAt: timestamp("last_listened_at", {
      withTimezone: true,
    }).notNull(),
    /** Plays between 22:00–06:59 UTC (for late-night preset heuristics). */
    nightPlayCount: integer("night_play_count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.trackId] }),
    index("user_track_stats_user_plays_idx").on(t.userId, t.playCount),
  ],
);

/** Per-user artist play aggregates (Phase 3). */
export const userArtistStats = pgTable(
  "user_artist_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    playCount: integer("play_count").notNull(),
    lastListenedAt: timestamp("last_listened_at", {
      withTimezone: true,
    }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.artistId] }),
    index("user_artist_stats_user_plays_idx").on(t.userId, t.playCount),
  ],
);

/** Computed listening summary for dashboards + solo scoring context (Phase 3). */
export const userPatternProfiles = pgTable("user_pattern_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  totalPlays: integer("total_plays").notNull(),
  peakHourUtc: integer("peak_hour_utc"),
  peakDowUtc: integer("peak_dow_utc"),
  vibeLine: text("vibe_line"),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
});

/** Solo / chatbot / group generated playlists (Phase 4+). */
export const generatedPlaylists = pgTable(
  "generated_playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull().default("solo"),
    preset: text("preset").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("generated_playlists_user_created_idx").on(t.userId, t.createdAt)],
);

export const generatedPlaylistTracks = pgTable(
  "generated_playlist_tracks",
  {
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => generatedPlaylists.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    score: doublePrecision("score").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.playlistId, t.position] }),
    index("generated_playlist_tracks_playlist_idx").on(t.playlistId),
  ],
);
