import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MoodDjClient } from "@/components/dashboard/mood-dj-client";

export default async function MoodDjPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <MoodDjClient />
    </main>
  );
}
