import { createClient } from "@/lib/supabase/server";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user!.id)
    .single();

  const name =
    profile?.display_name ?? profile?.username ?? user?.email ?? "there";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Hey, {name.split("@")[0]}
      </h1>
      <p className="mt-3 text-zinc-400">
        This is your PeaPod shell — listening intelligence, group sessions, and
        party voting land in later phases. Connect Spotify under{" "}
        <span className="text-zinc-200">Linked accounts</span> to get started.
      </p>
    </div>
  );
}
