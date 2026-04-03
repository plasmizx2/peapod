-- OAuth users have no local password. Safe to run if column is already nullable.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
