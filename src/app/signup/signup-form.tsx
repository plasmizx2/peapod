"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock } from "lucide-react";
import { motion } from "motion/react";

type Props = {
  showGoogle: boolean;
  showGithub: boolean;
};

export function SignupForm({ showGoogle, showGithub }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const registerRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const raw = await registerRes.text();
    let data: { error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as { error?: string }) : {};
    } catch {
      data = {};
    }
    if (!registerRes.ok) {
      setLoading(false);
      setError(
        data.error ??
          (registerRes.status >= 500
            ? `Server error (${registerRes.status}). Check deployment logs and DATABASE_URL.`
            : `Could not create account (${registerRes.status}).`),
      );
      return;
    }
    const signRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (signRes?.error) {
      setError("Account created — sign in manually.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function oauthSignIn(provider: "google" | "github") {
    setError(null);
    setOauthLoading(provider);
    await signIn(provider, { callbackUrl: "/dashboard" });
    setOauthLoading(null);
  }

  const oauthDivider =
    showGoogle || showGithub ? (
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-electric-blue/20" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-navy-light px-4 text-slate-light">or use</span>
        </div>
      </div>
    ) : null;

  const inputClass =
    "h-12 w-full rounded-xl border border-electric-blue/30 bg-deep-blue/50 pl-11 text-white outline-none backdrop-blur-sm placeholder:text-slate-400/80 focus:border-cyan-bright";

  return (
    <>
      <form onSubmit={onSubmit} className="mb-8 space-y-5">
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm text-white">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-bright" />
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm text-white">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-bright" />
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <button
            type="submit"
            disabled={loading || !!oauthLoading}
            className="relative h-12 w-full overflow-hidden rounded-xl font-semibold disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #4d8f6e 0%, #5fa88a 100%)",
              boxShadow: "0 0 36px rgba(77, 143, 110, 0.45)",
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-200%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative z-10 text-navy">
              {loading ? "Creating…" : "Create account"}
            </span>
          </button>
        </motion.div>
      </form>

      {oauthDivider}

      {(showGoogle || showGithub) && (
        <div className="space-y-3">
          {showGoogle ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button
                type="button"
                disabled={!!oauthLoading}
                onClick={() => void oauthSignIn("google")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-electric-blue/30 bg-electric-blue/5 text-white backdrop-blur-sm transition-all hover:border-electric-blue/60 hover:bg-electric-blue/10 disabled:opacity-50"
              >
                Google
              </button>
            </motion.div>
          ) : null}
          {showGithub ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button
                type="button"
                disabled={!!oauthLoading}
                onClick={() => void oauthSignIn("github")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-electric-blue/30 bg-electric-blue/5 text-white backdrop-blur-sm transition-all hover:border-electric-blue/60 hover:bg-electric-blue/10 disabled:opacity-50"
              >
                GitHub
              </button>
            </motion.div>
          ) : null}
        </div>
      )}
    </>
  );
}
