import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FigmaDashboardShell } from "@/components/dashboard/figma-dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <FigmaDashboardShell>
      {children}
    </FigmaDashboardShell>
  );
}
