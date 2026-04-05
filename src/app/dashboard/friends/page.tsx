import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/data/profile";
import { FriendsPageClient } from "@/components/dashboard/friends-page";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id);
  const friendCode = profile.friendCode ?? "Not found";
  return <FriendsPageClient initialFriendCode={friendCode} />;
}
