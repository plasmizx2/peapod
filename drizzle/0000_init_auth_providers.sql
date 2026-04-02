-- Run once on Render Postgres (SQL shell or `psql $DATABASE_URL -f ...`).
-- Or: `npm run db:push` with DATABASE_URL set (Drizzle will sync schema).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" text,
  "image" text,
  "email_verified" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "provider_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider_name" text NOT NULL,
  "provider_user_id" text NOT NULL,
  "account_status" text NOT NULL DEFAULT 'linked',
  "last_synced_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_accounts_user_provider_idx"
  ON "provider_accounts" ("user_id", "provider_name");

CREATE TABLE IF NOT EXISTS "provider_oauth_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_account_id" uuid NOT NULL UNIQUE REFERENCES "provider_accounts"("id") ON DELETE CASCADE,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "token_expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
