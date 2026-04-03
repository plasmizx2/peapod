import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Drizzle/postgres often nest the real `PostgresError` on `cause`. */
function errorText(err: unknown): string {
  const parts: string[] = [];
  let e: unknown = err;
  for (let depth = 0; e && depth < 6; depth++) {
    if (e instanceof Error) {
      parts.push(e.message);
      e = e.cause;
    } else if (e && typeof e === "object" && "message" in e) {
      parts.push(String((e as { message: unknown }).message));
      break;
    } else {
      parts.push(String(e));
      break;
    }
  }
  return parts.join(" | ");
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;
  const name = body.name?.trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const displayName = name || (email.split("@")[0] ?? "PeaPod user");

    await db.insert(users).values({
      email,
      passwordHash,
      name: displayName,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register]", err);
    const msg = errorText(err);
    const lower = msg.toLowerCase();
    if (lower.includes("database_url is not set")) {
      return NextResponse.json(
        {
          error:
            "DATABASE_URL is missing on the server. Add the full Postgres URL (with username and password) in your host’s environment variables, then redeploy.",
        },
        { status: 500 },
      );
    }
    if (lower.includes("does not exist") || lower.includes("relation")) {
      return NextResponse.json(
        {
          error:
            "Database tables are missing. Run migrations (e.g. drizzle SQL or db:push) on your production database.",
        },
        { status: 500 },
      );
    }
    if (
      lower.includes("econnrefused") ||
      lower.includes("getaddrinfo") ||
      lower.includes("enotfound") ||
      lower.includes("timeout") ||
      lower.includes("eai_again")
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot reach the database. Check DATABASE_URL on your host and that Postgres allows connections.",
        },
        { status: 500 },
      );
    }
    if (
      lower.includes("password authentication failed") ||
      lower.includes("28p01") ||
      lower.includes("authentication failed")
    ) {
      return NextResponse.json(
        {
          error:
            "Database rejected the connection (wrong user or password in DATABASE_URL). Fix credentials in your host’s environment variables.",
        },
        { status: 500 },
      );
    }
    if (
      lower.includes("certificate") ||
      lower.includes("ssl") ||
      lower.includes("unable_to_verify") ||
      lower.includes("self signed") ||
      lower.includes("tls")
    ) {
      return NextResponse.json(
        {
          error:
            "Database SSL/TLS error. For managed Postgres (Neon, Render, etc.), use the connection string they provide, usually with ?sslmode=require.",
        },
        { status: 500 },
      );
    }
    if (
      lower.includes("duplicate key") ||
      lower.includes("unique constraint") ||
      lower.includes("23505")
    ) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists (or a race while saving). Try signing in.",
        },
        { status: 409 },
      );
    }
    if (
      lower.includes("pg_hba.conf") ||
      lower.includes("no pg_hba") ||
      lower.includes("must be owner")
    ) {
      return NextResponse.json(
        {
          error:
            "Database refused the connection (host/network or permissions). Check your provider’s allowed IPs and DATABASE_URL.",
        },
        { status: 500 },
      );
    }
    if (
      lower.includes("too many connections") ||
      lower.includes("53300")
    ) {
      return NextResponse.json(
        {
          error:
            "Database is at its connection limit. Retry in a moment or raise the limit on your Postgres plan.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error:
          "Could not save your account. This is usually a database issue: set DATABASE_URL on your server, run migrations (npm run db:push) against that database, and check host logs for [register]. AUTH_SECRET is for sign-in sessions, not this step.",
      },
      { status: 500 },
    );
  }
}
