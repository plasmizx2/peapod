import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin, getAllUsers } from "@/lib/data/admin";
import { AdminDashboardClient } from "@/components/dashboard/admin-dashboard";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const admin = await isAdmin();
  if (!admin) redirect("/dashboard");

  const users = await getAllUsers();
  return <AdminDashboardClient users={users} />;
}
