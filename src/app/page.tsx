import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">PeaPod</span>
        <div className="flex gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-500"
          >
            Get started
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/90">
          Music intelligence
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Your patterns. Your crew. No more aux fights.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-400">
          PeaPod learns how you actually listen — then powers solo playlists, group
          sessions, and party voting so the queue feels alive.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-emerald-600 px-8 py-3 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Start with your taste
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-500"
          >
            I have an account
          </Link>
        </div>
      </main>
    </div>
  );
}
