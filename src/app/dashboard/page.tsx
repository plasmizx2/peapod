import { auth } from "@/auth";

export default async function DashboardHomePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const name =
    session?.user?.name ?? (email ? email.split("@")[0] : "there");

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
