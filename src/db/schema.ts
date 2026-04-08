import {
  boolean,
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
  /** admin | customer */
  role: text("role").notNull().default("customer"),
  /** False until the user completes the welcome/onboarding flow. */
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
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
    /** chatbot: gemini = blended + discovery; preset = keyword/heuristic only */
    moodEngine: text("mood_engine"),
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
    /** Spotify search discovery slice (Gemini chat blend), not catalog-ranked familiar */
    isDiscovery: boolean("is_discovery").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.playlistId, t.position] }),
    index("generated_playlist_tracks_playlist_idx").on(t.playlistId),
  ],
);

/** Mood chatbot prompts + outcomes (Phase 5). */
export const chatbotRequests = pgTable(
  "chatbot_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    promptText: text("prompt_text").notNull(),
    mappedPreset: text("mapped_preset").notNull(),
    intentLabel: text("intent_label"),
    explanation: text("explanation").notNull(),
    playlistId: uuid("playlist_id").references(() => generatedPlaylists.id, {
      onDelete: "set null",
    }),
    /** Follow-up only: lift / stay / shift. */
    adjustment: text("adjustment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("chatbot_requests_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/** Group listening lobby (Phase 6). */
export const listeningSessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostUserId: uuid("host_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinCode: text("join_code").notNull().unique(),
    /** active | ended */
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** manual | equal_play | lean_driver | hype */
    queueMode: text("queue_mode").notNull().default("manual"),
    /** For lean_driver: whose taste counts double. */
    driverUserId: uuid("driver_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Host Spotify playlist id — played session tracks append here (driving log). */
    driverSavePlaylistId: text("driver_save_playlist_id"),
    /**
     * playback — save from Play next / Play all (see play_next_only).
     * play_next_only — only append when host uses Play next (not Play all).
     * vote_threshold — append when net votes reach driverSaveVoteThreshold (not from playback).
     */
    driverSaveMode: text("driver_save_mode").notNull().default("playback"),
    /** When driverSaveMode is vote_threshold: save to main log when sum(votes) >= this. */
    driverSaveVoteThreshold: integer("driver_save_vote_threshold")
      .notNull()
      .default(2),
    /** Optional playlist for “parking lot” / downvoted tracks. */
    driverRejectPlaylistId: text("driver_reject_playlist_id"),
    /** Append to reject playlist when net votes <= this (e.g. -2). */
    driverRejectVoteThreshold: integer("driver_reject_vote_threshold")
      .notNull()
      .default(-2),
  },
  (t) => [index("sessions_join_code_idx").on(t.joinCode)],
);

export const sessionMembers = pgTable(
  "session_members",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => listeningSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** host | member */
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.userId] }),
    index("session_members_user_idx").on(t.userId),
  ],
);

/** Ordered tracks for a group session (Phase 7 scaffold). */
export const sessionQueue = pgTable(
  "session_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => listeningSessions.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    queuePosition: integer("queue_position").notNull(),
    /** member_add | ai | vote | fallback | request */
    sourceType: text("source_type").notNull().default("member_add"),
    addedByUserId: uuid("added_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** For request-type adds: who originally requested the track. */
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    playedAt: timestamp("played_at", { withTimezone: true }),
    score: doublePrecision("score"),
    /** queued | soft_vetoed | hard_vetoed */
    status: text("status").notNull().default("queued"),
    vetoedAt: timestamp("vetoed_at", { withTimezone: true }),
    /** Set when this row was appended to the host driving log playlist. */
    driverPositiveLoggedAt: timestamp("driver_positive_logged_at", {
      withTimezone: true,
    }),
    /** Set when this row was appended to the reject / parking-lot playlist. */
    driverRejectLoggedAt: timestamp("driver_reject_logged_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("session_queue_session_position_idx").on(t.sessionId, t.queuePosition),
    uniqueIndex("session_queue_session_position_uidx").on(
      t.sessionId,
      t.queuePosition,
    ),
  ],
);

/** Party votes on queued tracks (Phase 8 scaffold). */
export const sessionVotes = pgTable(
  "session_votes",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => listeningSessions.id, { onDelete: "cascade" }),
    queueItemId: uuid("queue_item_id")
      .notNull()
      .references(() => sessionQueue.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** +1 upvote, −1 downvote */
    value: integer("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.userId, t.queueItemId] }),
    index("session_votes_queue_item_idx").on(t.queueItemId),
  ],
);

/** Per-user veto actions on queued tracks — democratic veto system. */
export const sessionVetoes = pgTable(
  "session_vetoes",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => listeningSessions.id, { onDelete: "cascade" }),
    queueItemId: uuid("queue_item_id")
      .notNull()
      .references(() => sessionQueue.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.userId, t.queueItemId] }),
    index("session_vetoes_queue_item_idx").on(t.queueItemId),
  ],
);

/** User profile — display name, bio, avatar, privacy, friend code. */
export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    /** Unique friend code for discovery (auto-generated, customizable) */
    friendCode: text("friend_code"),
    /** When the friend code was last changed, to enforce 24h limit */
    friendCodeUpdatedAt: timestamp("friend_code_updated_at", { withTimezone: true }),
    phoneNumber: text("phone_number"),
    /** public | friends_only | private */
    listeningVisibility: text("listening_visibility").notNull().default("friends_only"),
    /** Whether this user's session history is visible to friends */
    sessionHistoryVisible: boolean("session_history_visible").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_profiles_friend_code_idx").on(t.friendCode),
  ],
);

/** Friendships — bidirectional with pending/accepted status. */
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** pending | accepted | declined */
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("friendships_pair_idx").on(t.requesterId, t.addresseeId),
    index("friendships_addressee_idx").on(t.addresseeId),
  ],
);

/** Song of the day — one per user per date. */
export const songOfTheDay = pgTable(
  "song_of_the_day",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    /** Date string YYYY-MM-DD for uniqueness */
    dateStr: text("date_str").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("song_of_the_day_user_date_idx").on(t.userId, t.dateStr),
  ],
);
