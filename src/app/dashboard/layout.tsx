import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { FigmaDashboardShell } from "@/components/dashboard/figma-dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Redirect first-time users to onboarding.
  const [user] = await db
    .select({
      onboardingCompleted: users.onboardingCompleted,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (user && !user.onboardingCompleted) {
    redirect("/onboarding");
  }

  const isAdminUser = user?.role === "admin";

  return (
    <FigmaDashboardShell isAdminUser={isAdminUser}>
      {children}
    </FigmaDashboardShell>
  );
}
