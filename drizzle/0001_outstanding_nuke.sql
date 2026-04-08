ALTER TABLE "generated_playlist_tracks" ADD COLUMN "is_discovery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_playlists" ADD COLUMN "mood_engine" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "friend_code" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "friend_code_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_friend_code_idx" ON "user_profiles" USING btree ("friend_code");