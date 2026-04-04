import { Suspense } from "react";
import { SessionLobbyPage } from "@/components/dashboard/session-lobby-page";

export default function DashboardSessionsPage() {
  return (
    <Suspense
      fallback={
        <p className="text-moss" role="status">
          Loading…
        </p>
      }
    >
      <SessionLobbyPage />
    </Suspense>
  );
}
