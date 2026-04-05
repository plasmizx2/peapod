CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spotify_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "artists_spotify_id_unique" UNIQUE("spotify_id")
);
--> statement-breakpoint
CREATE TABLE "chatbot_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt_text" text NOT NULL,
	"mapped_preset" text NOT NULL,
	"intent_label" text,
	"explanation" text NOT NULL,
	"playlist_id" uuid,
	"adjustment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_playlist_tracks" (
	"playlist_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"track_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	CONSTRAINT "generated_playlist_tracks_playlist_id_position_pk" PRIMARY KEY("playlist_id","position")
);
--> statement-breakpoint
CREATE TABLE "generated_playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" text DEFAULT 'solo' NOT NULL,
	"preset" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_account_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"listened_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"join_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"queue_mode" text DEFAULT 'manual' NOT NULL,
	"driver_user_id" uuid,
	"driver_save_playlist_id" text,
	"driver_save_mode" text DEFAULT 'playback' NOT NULL,
	"driver_save_vote_threshold" integer DEFAULT 2 NOT NULL,
	"driver_reject_playlist_id" text,
	"driver_reject_vote_threshold" integer DEFAULT -2 NOT NULL,
	CONSTRAINT "sessions_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_name" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"account_status" text DEFAULT 'linked' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_oauth_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_account_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "provider_oauth_credentials_provider_account_id_unique" UNIQUE("provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "session_members" (
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_members_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "session_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"queue_position" integer NOT NULL,
	"source_type" text DEFAULT 'member_add' NOT NULL,
	"added_by_user_id" uuid,
	"requested_by_user_id" uuid,
	"played_at" timestamp with time zone,
	"score" double precision,
	"status" text DEFAULT 'queued' NOT NULL,
	"vetoed_at" timestamp with time zone,
	"driver_positive_logged_at" timestamp with time zone,
	"driver_reject_logged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_vetoes" (
	"session_id" uuid NOT NULL,
	"queue_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_vetoes_session_id_user_id_queue_item_id_pk" PRIMARY KEY("session_id","user_id","queue_item_id")
);
--> statement-breakpoint
CREATE TABLE "session_votes" (
	"session_id" uuid NOT NULL,
	"queue_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_votes_session_id_user_id_queue_item_id_pk" PRIMARY KEY("session_id","user_id","queue_item_id")
);
--> statement-breakpoint
CREATE TABLE "song_of_the_day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"date_str" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text DEFAULT 'spotify_recently_played' NOT NULL,
	"status" text NOT NULL,
	"imported" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"pages_fetched" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spotify_id" text NOT NULL,
	"name" text NOT NULL,
	"album_name" text,
	"primary_artist_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tracks_spotify_id_unique" UNIQUE("spotify_id")
);
--> statement-breakpoint
CREATE TABLE "user_artist_stats" (
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"play_count" integer NOT NULL,
	"last_listened_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_artist_stats_user_id_artist_id_pk" PRIMARY KEY("user_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "user_pattern_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_plays" integer NOT NULL,
	"peak_hour_utc" integer,
	"peak_dow_utc" integer,
	"vibe_line" text,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"listening_visibility" text DEFAULT 'friends_only' NOT NULL,
	"session_history_visible" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_track_stats" (
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"play_count" integer NOT NULL,
	"last_listened_at" timestamp with time zone NOT NULL,
	"night_play_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_track_stats_user_id_track_id_pk" PRIMARY KEY("user_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text,
	"image" text,
	"email_verified" timestamp with time zone,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chatbot_requests" ADD CONSTRAINT "chatbot_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_requests" ADD CONSTRAINT "chatbot_requests_playlist_id_generated_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."generated_playlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_playlist_tracks" ADD CONSTRAINT "generated_playlist_tracks_playlist_id_generated_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."generated_playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_playlist_tracks" ADD CONSTRAINT "generated_playlist_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_playlists" ADD CONSTRAINT "generated_playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_events" ADD CONSTRAINT "listening_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_events" ADD CONSTRAINT "listening_events_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_events" ADD CONSTRAINT "listening_events_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_driver_user_id_users_id_fk" FOREIGN KEY ("driver_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_oauth_credentials" ADD CONSTRAINT "provider_oauth_credentials_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_members" ADD CONSTRAINT "session_members_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_members" ADD CONSTRAINT "session_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queue" ADD CONSTRAINT "session_queue_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queue" ADD CONSTRAINT "session_queue_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queue" ADD CONSTRAINT "session_queue_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queue" ADD CONSTRAINT "session_queue_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_vetoes" ADD CONSTRAINT "session_vetoes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_vetoes" ADD CONSTRAINT "session_vetoes_queue_item_id_session_queue_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "public"."session_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_vetoes" ADD CONSTRAINT "session_vetoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_votes" ADD CONSTRAINT "session_votes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_votes" ADD CONSTRAINT "session_votes_queue_item_id_session_queue_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "public"."session_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_votes" ADD CONSTRAINT "session_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_of_the_day" ADD CONSTRAINT "song_of_the_day_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_of_the_day" ADD CONSTRAINT "song_of_the_day_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_primary_artist_id_artists_id_fk" FOREIGN KEY ("primary_artist_id") REFERENCES "public"."artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_artist_stats" ADD CONSTRAINT "user_artist_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_artist_stats" ADD CONSTRAINT "user_artist_stats_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pattern_profiles" ADD CONSTRAINT "user_pattern_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_track_stats" ADD CONSTRAINT "user_track_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_track_stats" ADD CONSTRAINT "user_track_stats_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chatbot_requests_user_created_idx" ON "chatbot_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_idx" ON "friendships" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX "generated_playlist_tracks_playlist_idx" ON "generated_playlist_tracks" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX "generated_playlists_user_created_idx" ON "generated_playlists" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listening_events_user_time_track_idx" ON "listening_events" USING btree ("user_id","listened_at","track_id");--> statement-breakpoint
CREATE INDEX "listening_events_user_listened_idx" ON "listening_events" USING btree ("user_id","listened_at");--> statement-breakpoint
CREATE INDEX "sessions_join_code_idx" ON "sessions" USING btree ("join_code");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_accounts_user_provider_idx" ON "provider_accounts" USING btree ("user_id","provider_name");--> statement-breakpoint
CREATE INDEX "session_members_user_idx" ON "session_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_queue_session_position_idx" ON "session_queue" USING btree ("session_id","queue_position");--> statement-breakpoint
CREATE UNIQUE INDEX "session_queue_session_position_uidx" ON "session_queue" USING btree ("session_id","queue_position");--> statement-breakpoint
CREATE INDEX "session_vetoes_queue_item_idx" ON "session_vetoes" USING btree ("queue_item_id");--> statement-breakpoint
CREATE INDEX "session_votes_queue_item_idx" ON "session_votes" USING btree ("queue_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "song_of_the_day_user_date_idx" ON "song_of_the_day" USING btree ("user_id","date_str");--> statement-breakpoint
CREATE INDEX "sync_jobs_user_started_idx" ON "sync_jobs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "user_artist_stats_user_plays_idx" ON "user_artist_stats" USING btree ("user_id","play_count");--> statement-breakpoint
CREATE INDEX "user_track_stats_user_plays_idx" ON "user_track_stats" USING btree ("user_id","play_count");