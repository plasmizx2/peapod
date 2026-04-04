"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

/** Refetch session periodically so long-lived tabs stay authenticated after JWT refresh. */
const REFETCH_INTERVAL_SEC = 5 * 60;

export function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  /** From `auth()` in the root layout — avoids a logged-out flash on load and client navigations. */
  session: Session | null;
}) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={REFETCH_INTERVAL_SEC}
      refetchOnWindowFocus
    >
      {children}
    </SessionProvider>
  );
}
