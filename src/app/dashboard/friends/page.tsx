import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FriendsPageClient } from "@/components/dashboard/friends-page";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <FriendsPageClient />;
}
