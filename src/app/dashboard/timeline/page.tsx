import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TimelinePageClient } from "@/components/dashboard/timeline-page";

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <TimelinePageClient />;
}
