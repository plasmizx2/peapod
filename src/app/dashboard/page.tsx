import { count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { listeningEvents } from "@/db/schema";
import { FigmaDashboardHome } from "@/components/dashboard/figma-dashboard-home";

export default async function DashboardHomePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const name =
    session?.user?.name ?? (email ? email.split("@")[0] : "there");
  const firstName = name.split("@")[0];

  let listeningCount = 0;
  if (session?.user?.id) {
    const [row] = await db
      .select({ n: count() })
      .from(listeningEvents)
      .where(eq(listeningEvents.userId, session.user.id));
    listeningCount = Number(row?.n ?? 0);
  }

  return (
    <FigmaDashboardHome firstName={firstName} listeningCount={listeningCount} />
  );
}
