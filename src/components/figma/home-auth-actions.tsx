"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";

export function HomeHeaderAuthLink() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="text-slate-light/60 text-sm sm:text-base tabular-nums">
        …
      </span>
    );
  }

  if (session?.user) {
    return (
      <Link
        href="/dashboard"
        className="text-slate-light hover:text-cyan-bright transition-colors text-sm sm:text-base font-medium"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="text-slate-light hover:text-cyan-bright transition-colors text-sm sm:text-base font-medium"
    >
      Sign in
    </Link>
  );
}

export function HomeHeroSecondaryCta() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <motion.button
        disabled
        className="w-full sm:w-auto px-10 py-5 border-2 border-electric-blue/40 rounded-2xl font-semibold text-lg backdrop-blur-sm bg-electric-blue/5 opacity-60"
        style={{ color: "#8fd4b8" }}
      >
        …
      </motion.button>
    );
  }

  if (session?.user) {
    return (
      <Link href="/dashboard">
        <motion.button
          className="w-full sm:w-auto px-10 py-5 border-2 border-electric-blue/40 rounded-2xl font-semibold text-lg backdrop-blur-sm bg-electric-blue/5"
          style={{ color: "#8fd4b8" }}
          whileHover={{
            scale: 1.05,
            borderColor: "rgba(77, 143, 110, 0.75)",
            backgroundColor: "rgba(77, 143, 110, 0.12)",
            boxShadow: "0 0 28px rgba(77, 143, 110, 0.28)",
          }}
          whileTap={{ scale: 0.98 }}
        >
          Open dashboard
        </motion.button>
      </Link>
    );
  }

  return (
    <Link href="/login">
      <motion.button
        className="w-full sm:w-auto px-10 py-5 border-2 border-electric-blue/40 rounded-2xl font-semibold text-lg backdrop-blur-sm bg-electric-blue/5"
        style={{ color: "#8fd4b8" }}
        whileHover={{
          scale: 1.05,
          borderColor: "rgba(77, 143, 110, 0.75)",
          backgroundColor: "rgba(77, 143, 110, 0.12)",
          boxShadow: "0 0 28px rgba(77, 143, 110, 0.28)",
        }}
        whileTap={{ scale: 0.98 }}
      >
        Sign in
      </motion.button>
    </Link>
  );
}
