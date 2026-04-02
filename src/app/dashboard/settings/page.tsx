export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-3 text-zinc-400">
        Profile editing and preferences will live here. For now, use Supabase Auth
        for email and manage linked providers under{" "}
        <span className="text-zinc-200">Linked accounts</span>.
      </p>
    </div>
  );
}
