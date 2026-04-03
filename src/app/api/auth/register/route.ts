import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

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
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("DATABASE_URL is not set")) {
      return NextResponse.json(
        {
          error:
            "DATABASE_URL is missing on the server. Add the full Postgres URL (with username and password) in your host’s environment variables, then redeploy.",
        },
        { status: 500 },
      );
    }
    if (msg.includes("does not exist") || msg.includes("relation")) {
      return NextResponse.json(
        {
          error:
            "Database tables are missing. Run migrations (e.g. drizzle SQL or db:push) on your production database.",
        },
        { status: 500 },
      );
    }
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("getaddrinfo") ||
      msg.includes("timeout")
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot reach the database. Check DATABASE_URL on your host and that Postgres allows connections.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        error:
          "Could not save your account. If this persists, verify DATABASE_URL and AUTH setup on the server.",
      },
      { status: 500 },
    );
  }
}
