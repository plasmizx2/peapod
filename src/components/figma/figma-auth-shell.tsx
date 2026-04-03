"use client";

import { motion } from "motion/react";
import { Logo } from "./figma-logo";

type Props = {
  variant: "signin" | "signup";
  children: React.ReactNode;
  /** Extra content inside the card after children (e.g. link to sign up). */
  footer?: React.ReactNode;
};

const copy = {
  signin: {
    title: "Back in",
    subtitle: "Pick up where the music left off.",
  },
  signup: {
    title: "Jump in",
    subtitle: "Get an account, link Spotify, let it learn.",
  },
};

export function FigmaAuthShell({ variant, children, footer }: Props) {
  const c = copy[variant];

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-navy p-4 sm:p-6">
      <motion.div
        className="absolute top-20 right-20 h-96 w-96 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(151, 205, 151, 0.28) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 left-20 h-96 w-96 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(156, 172, 84, 0.26) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8">
          <Logo />
        </div>

        <motion.div
          className="relative overflow-hidden rounded-3xl border border-electric-blue/30 bg-navy-light/70 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            boxShadow:
              "0 0 72px rgba(77, 143, 110, 0.18), inset 0 0 72px rgba(77, 143, 110, 0.03)",
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(151, 205, 151, 0.18), rgba(77, 143, 110, 0.2), rgba(156, 172, 84, 0.18))",
              opacity: 0.5,
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative z-10">
            <div className="mb-8">
              <h1 className="mb-3 text-4xl font-bold sm:text-5xl">
                <span className="bg-gradient-to-r from-neon-green via-cyan-bright to-electric-blue bg-clip-text text-transparent">
                  {c.title}
                </span>
              </h1>
              <p className="text-sm text-slate-light sm:text-base">{c.subtitle}</p>
            </div>
            {children}
            {footer}
          </div>
        </motion.div>

        {variant === "signup" ? (
          <motion.p
            className="mx-auto mt-6 max-w-sm text-center text-xs text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Beta software. Things break. We&apos;re building it anyway.
          </motion.p>
        ) : null}
      </motion.div>
    </div>
  );
}
