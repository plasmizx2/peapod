import { auth } from "@/auth";
import { FigmaDashboardHome } from "@/components/dashboard/figma-dashboard-home";

export default async function DashboardHomePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const name =
    session?.user?.name ?? (email ? email.split("@")[0] : "there");
  const firstName = name.split("@")[0];

  return <FigmaDashboardHome firstName={firstName} />;
}
