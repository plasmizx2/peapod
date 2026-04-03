"use client";

import Link from "next/link";
import { ArrowRight, Settings as SettingsIcon } from "lucide-react";
import { motion } from "motion/react";

export function FigmaSettingsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl sm:text-5xl mb-2 text-forest-dark">
          Settings
        </h1>
        <p className="text-base sm:text-lg text-moss">
          Profile and preferences. Building this out as we go.
        </p>
      </motion.div>

      {/* Placeholder Card */}
      <motion.div
        className="bg-cream rounded-2xl border border-forest/10 p-8 sm:p-12 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="text-center py-6 sm:py-8">
          <motion.div
            className="w-20 h-20 rounded-2xl bg-sage/20 flex items-center justify-center mx-auto mb-5"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <SettingsIcon className="w-10 h-10 text-sage" />
          </motion.div>

          <h3 className="text-2xl sm:text-3xl mb-3 text-forest-dark">
            Barebones for now
          </h3>
          <p className="text-sm sm:text-base text-moss mb-6 max-w-md mx-auto leading-relaxed">
            Getting Spotify working first. Profile stuff, notifications,
            privacy controls — all that shows up here when we build it.
          </p>
          <Link
            href="/dashboard/accounts"
            className="inline-flex items-center gap-2 text-forest-dark hover:text-sage transition-colors font-medium group"
          >
            Connect music instead
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>

      {/* Roadmap */}
      <motion.div
        className="bg-sage/10 rounded-2xl border border-sage/30 p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h4 className="font-semibold text-forest-dark mb-4 text-sm sm:text-base">
          What&apos;s coming
        </h4>
        <ul className="space-y-3 text-sm text-moss">
          {[
            "Profile (name, photo, maybe a bio)",
            "Notification settings",
            "Privacy toggles",
            "Data export",
          ].map((item, idx) => (
            <motion.li
              key={item}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-sage flex-shrink-0"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: idx * 0.2,
                }}
              />
              {item}
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
