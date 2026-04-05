"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Music, ChevronRight, Loader2 } from "lucide-react";

type Step = "welcome" | "spotify";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [connectingSpotify, setConnectingSpotify] = useState(false);

  async function saveName() {
    setSaving(true);
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setStep("spotify");
    } finally {
      setSaving(false);
    }
  }

  async function connectSpotify() {
    setConnectingSpotify(true);
    // Redirect to Spotify OAuth; it will come back to /dashboard/music-services
    window.location.href = "/api/providers/spotify/connect";
  }

  async function skipSpotify() {
    // Mark complete if not already done
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream p-4">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Logo */}
        <p className="text-center font-display text-2xl font-semibold text-forest-dark">
          PeaPod
        </p>

        {step === "welcome" ? (
          <div className="rounded-3xl border border-forest/10 bg-white/80 p-8 shadow-md">
            <h1 className="font-display text-3xl font-semibold text-forest-dark">
              Welcome! 👋
            </h1>
            <p className="mt-2 text-sm text-moss">
              Let&apos;s get you set up in 30 seconds.
            </p>

            <div className="mt-6 space-y-2">
              <label
                htmlFor="onboarding-name"
                className="block text-sm font-medium text-forest-dark"
              >
                What should we call you?
              </label>
              <input
                id="onboarding-name"
                type="text"
                autoFocus
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                }}
                placeholder="Your name or nickname"
                className="w-full rounded-2xl border border-forest/15 bg-cream px-4 py-3 text-sm text-forest-dark outline-none placeholder:text-moss/50 focus:border-forest/40 focus:ring-2 focus:ring-forest/10"
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveName()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3 text-sm font-semibold text-mint-light shadow-lg transition hover:bg-forest-dark disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden />
              )}
              {saving ? "Saving…" : "Continue"}
            </button>

            <button
              type="button"
              onClick={() => void skipSpotify()}
              className="mt-3 w-full text-center text-xs text-moss hover:text-forest-dark"
            >
              Skip for now
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-forest/10 bg-white/80 p-8 shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1DB954]/10">
              <Music className="h-6 w-6 text-[#1DB954]" aria-hidden />
            </div>
            <h1 className="font-display text-2xl font-semibold text-forest-dark">
              Connect Spotify
            </h1>
            <p className="mt-2 text-sm text-moss">
              Link your Spotify account so PeaPod can show your listening stats
              and let you host group sessions.
            </p>

            <button
              type="button"
              disabled={connectingSpotify}
              onClick={() => void connectSpotify()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1DB954] py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#17a34a] disabled:opacity-50"
            >
              {connectingSpotify ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Music className="h-4 w-4" aria-hidden />
              )}
              {connectingSpotify ? "Connecting…" : "Connect Spotify"}
            </button>

            <button
              type="button"
              onClick={() => void skipSpotify()}
              className="mt-3 w-full text-center text-xs text-moss hover:text-forest-dark"
            >
              Skip — I&apos;ll do this later
            </button>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex justify-center gap-2">
          <span
            className={`h-1.5 w-6 rounded-full transition-colors ${step === "welcome" ? "bg-forest" : "bg-forest/30"}`}
          />
          <span
            className={`h-1.5 w-6 rounded-full transition-colors ${step === "spotify" ? "bg-forest" : "bg-forest/30"}`}
          />
        </div>
      </div>
    </div>
  );
}
