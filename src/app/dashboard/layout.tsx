import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between gap-6 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            PeaPod
          </Link>
          <nav className="flex gap-5 text-sm text-zinc-400">
            <Link href="/dashboard" className="hover:text-zinc-200">
              Home
            </Link>
            <Link href="/dashboard/accounts" className="hover:text-zinc-200">
              Linked accounts
            </Link>
            <Link href="/dashboard/settings" className="hover:text-zinc-200">
              Settings
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
