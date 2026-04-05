import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream p-6">
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <p className="font-display text-8xl font-semibold text-forest/20">404</p>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-forest-dark sm:text-4xl">
            Lost in the queue
          </h1>
          <p className="mt-3 text-base text-moss">
            That page doesn&apos;t exist — it may have moved or never been.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block rounded-2xl bg-forest px-6 py-3 text-sm font-semibold text-mint-light shadow-lg transition hover:bg-forest-dark"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
