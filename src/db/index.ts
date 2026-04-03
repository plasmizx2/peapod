import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

let _db: Db | undefined;

/**
 * Lazily connects so missing DATABASE_URL fails on first query (with JSON errors)
 * instead of crashing module load with an HTML 500.
 */
export function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(url, {
    max: 10,
    ssl: url.includes("localhost") ? false : "require",
    prepare: false,
  });

  _db = drizzle(client, { schema });
  return _db;
}

/** Same as getDb(); kept for existing imports. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});
