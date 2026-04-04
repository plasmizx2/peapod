import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same env files as Next.js (.env.local, .env) so `npm run db:push` sees DATABASE_URL.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
