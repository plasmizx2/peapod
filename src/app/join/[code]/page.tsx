import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listeningSessions, sessionMembers, users } from "@/db/schema";
import { normalizeJoinCode } from "@/lib/sessions/join-code";
import { JoinButton } from "./join-button";

type Props = { params: Promise<{ code: string }> };

async function getSessionPreview(code: string) {
  const [session] = await db
    .select({
      id: listeningSessions.id,
      joinCode: listeningSessions.joinCode,
      status: listeningSessions.status,
      hostUserId: listeningSessions.hostUserId,
    })
    .from(listeningSessions)
    .where(eq(listeningSessions.joinCode, code))
    .limit(1);

  if (!session) return null;

  const [host] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.hostUserId))
    .limit(1);

  const [memberAgg] = await db
    .select({ n: count() })
    .from(sessionMembers)
    .where(eq(sessionMembers.sessionId, session.id));

  return {
    sessionId: session.id,
    joinCode: session.joinCode,
    status: session.status as "active" | "ended",
    hostDisplayName:
      host?.name?.trim() || host?.email?.split("@")[0] || "Someone",
    memberCount: Number(memberAgg?.n ?? 0),
  };
}

export default async function JoinSessionPage({ params }: Props) {
  const { code: raw } = await params;
  const code = normalizeJoinCode(raw ?? "");

  if (code.length < 4) {
    redirect("/dashboard/sessions");
  }

  const [preview, userSession] = await Promise.all([
    getSessionPreview(code),
    auth(),
  ]);

  const userId = userSession?.user?.id;

  // Already a member → go straight in
  if (preview?.status === "active" && userId) {
    const [existing] = await db
      .select({ userId: sessionMembers.userId })
      .from(sessionMembers)
      .where(
        and(
          eq(sessionMembers.sessionId, preview.sessionId),
          eq(sessionMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      redirect(`/dashboard/sessions?session=${preview.sessionId}`);
    }
  }

  const isActive = preview?.status === "active";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-cream p-4">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Wordmark */}
        <p className="text-center font-display text-2xl font-semibold text-forest-dark">
          PeaPod
        </p>

        {!preview || !isActive ? (
          <div className="rounded-3xl border border-forest/10 bg-white/80 p-8 text-center shadow-md">
            <h1 className="font-display text-2xl font-semibold text-forest-dark">
              {!preview ? "Session not found" : "Session ended"}
            </h1>
            <p className="mt-3 text-sm text-moss">
              {!preview
                ? "That join code doesn't match any session. Double-check and try again."
                : "This session has already ended."}
            </p>
            <Link
              href="/dashboard/sessions"
              className="mt-6 inline-block rounded-2xl bg-forest px-6 py-2.5 text-sm font-semibold text-mint-light shadow transition hover:bg-forest-dark"
            >
              Start your own
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-forest/10 bg-cream p-8 shadow-xl">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-forest-dark">
              You&apos;re invited
            </h1>
            <p className="mt-1 text-sm text-moss">
              Join the group session below.
            </p>

            <div className="mt-6 space-y-3 rounded-2xl border border-forest/10 bg-white/60 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-moss">Hosted by</span>
                <span className="font-medium text-forest-dark">
                  {preview.hostDisplayName}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-moss">Listeners</span>
                <span className="font-medium text-forest-dark">
                  {preview.memberCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-moss">Code</span>
                <span className="font-mono text-base font-bold tracking-widest text-forest-dark">
                  {preview.joinCode}
                </span>
              </div>
            </div>

            <div className="mt-6">
              {userId ? (
                <JoinButton
                  sessionId={preview.sessionId}
                  joinCode={preview.joinCode}
                />
              ) : (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/join/${code}`)}`}
                  className="block w-full rounded-2xl bg-forest py-3 text-center text-sm font-semibold text-mint-light shadow-lg transition hover:bg-forest-dark"
                >
                  Sign in to join
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
