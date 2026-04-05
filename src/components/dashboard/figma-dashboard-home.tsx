"use client";

import Link from "next/link";
import {
  BarChart3,
  Clock,
  Mic2,
  Music,
  ArrowRight,
  Sparkles,
  Users,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { useState } from "react";
import { SoloPresetPlaylists } from "@/components/dashboard/solo-preset-playlists";
import type { SongOfTheDayResult } from "@/lib/data/song-of-the-day";

function formatPlayedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function FigmaDashboardHome({
  firstName,
  listeningCount,
  songOfDay,
}: {
  firstName: string;
  listeningCount: number;
  songOfDay: SongOfTheDayResult | null;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [songOfDayExpanded, setSongOfDayExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1
          className="text-5xl sm:text-6xl mb-3 text-forest-dark"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <motion.span
            className="inline-block"
            whileHover={{ scale: 1.1, rotate: 5, color: "#7fa88f" }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {firstName}, you&apos;re{" "}
          </motion.span>
          <motion.span
            className="inline-block text-sage"
            animate={{ 
              textShadow: [
                "0 0 0px #7fa88f",
                "0 0 20px #7fa88f",
                "0 0 0px #7fa88f"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            in
          </motion.span>
        </motion.h1>
        <p className="text-base sm:text-lg text-moss">
          {listeningCount > 0
            ? `${listeningCount.toLocaleString()} plays on file — sync again anytime under Music services.`
            : "Connect Spotify under Music services, then sync recent plays to get started."}
        </p>
        <p className="mt-3 max-w-2xl text-sm text-moss sm:text-base">
          <span className="font-medium text-forest-dark">Solo</span> is your
          personal snapshot on this page. With friends,{" "}
          <Link
            href="/dashboard/sessions"
            className="font-medium text-sage underline decoration-sage/40 underline-offset-2 hover:text-forest-dark"
          >
            Group session
          </Link>{" "}
          is a shared queue and votes — the host plays Spotify on their device.
        </p>
        {/* Dropdown Song of the day */}
        {songOfDay ? (
          <div className="mt-6 w-full max-w-2xl rounded-2xl border border-sage/20 bg-forest/5 shadow-sm">
            <button
              type="button"
              onClick={() => setSongOfDayExpanded(!songOfDayExpanded)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-forest/5 focus:outline-none rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <Music className="h-4 w-4 text-sage" />
                <span className="text-sm font-medium text-forest-dark sm:text-base">
                  PeaPod&apos;s Pick For You:{" "}
                  <span className="font-semibold">{songOfDay.trackName}</span>
                </span>
              </div>
              <motion.div
                animate={{ rotate: songOfDayExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="h-5 w-5 text-moss" />
              </motion.div>
            </button>
            <AnimatePresence>
              {songOfDayExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-sage/10 px-5 pb-5 pt-3">
                    <p className="text-base text-forest-dark">
                      <span className="text-moss">By</span> {songOfDay.artistName}
                    </p>
                    {songOfDay.reason ? (
                      <div className="mt-4 rounded-xl bg-white/60 px-4 py-3 text-sm italic text-forest-dark border border-sage/10">
                        "{songOfDay.reason}"
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </motion.div>

      {listeningCount > 0 ? (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-2xl font-semibold text-forest-dark sm:text-3xl mt-4">
            DJ Booth
          </h2>

          <SoloPresetPlaylists />

          {/* CTA Banner to AI DJ */}
          <Link href="/dashboard/dj" className="block relative overflow-hidden rounded-3xl bg-gradient-to-br from-mint-light via-white to-sage/10 p-8 shadow-sm border border-sage/20 transition-all hover:shadow-md hover:-translate-y-1 group">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sage/20 mix-blend-multiply blur-2xl transition-all group-hover:scale-150 group-hover:bg-sage/30"></div>
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-forest-light/10 mix-blend-multiply blur-2xl transition-all group-hover:scale-150 group-hover:bg-forest-light/20"></div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sage text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-bold text-forest-dark tracking-tight">AI DJ Mode</h3>
                </div>
                <p className="text-moss text-sm max-w-sm">Launch an immersive chat with your personal music intelligence. Generate instant vibes based on your exact mood.</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-forest text-mint-light font-medium shadow-sm transition group-hover:bg-forest-dark">
                Initialize session <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          <p className="text-center text-sm text-moss">
            <Link
              href="/dashboard/accounts"
              className="font-medium text-sage underline decoration-sage/40 underline-offset-2 hover:text-forest-dark"
            >
              Music services
            </Link>{" "}
            — sync walks your recent Spotify history (paginated).
          </p>
        </motion.div>
      ) : null}

      {/* 3D Tilt Card */}
      <motion.div
        className="relative cursor-pointer overflow-hidden rounded-3xl border border-forest/10 bg-cream p-8 shadow-2xl perspective-[1000px] sm:p-10"
        initial={{ opacity: 0, y: 30, rotateX: -15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          x.set(0);
          y.set(0);
        }}
        whileHover={{ scale: 1.02 }}
      >
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-sage/30 rounded-full"
            style={{
              left: `${20 + i * 10}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}

        {/* Gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-sage/20 via-transparent to-rust/20 rounded-3xl"
          animate={{
            opacity: isHovering ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />

        <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
          <motion.div
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sage to-forest flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{
              transform: "translateZ(50px)",
            }}
            animate={{
              rotate: [0, 360],
              boxShadow: [
                "0 10px 30px rgba(127, 168, 143, 0.3)",
                "0 20px 40px rgba(127, 168, 143, 0.5)",
                "0 10px 30px rgba(127, 168, 143, 0.3)",
              ],
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              boxShadow: { duration: 2, repeat: Infinity },
            }}
          >
            <Music className="w-10 h-10 text-mint-light" />
          </motion.div>

          <div className="flex-1 w-full sm:w-auto">
            <h3 className="text-2xl sm:text-3xl mb-3 text-forest-dark font-semibold">
              {listeningCount > 0 ? "Music services" : "Connect Spotify"}
            </h3>
            <p className="text-sm sm:text-base text-moss mb-6 leading-relaxed">
              {listeningCount > 0
                ? "Link, reconnect, or run another sync — everything stays on our servers."
                : "30 seconds to link your account. Then we pull listening history, analyze patterns, and start building your personal music brain."}
            </p>

            <Link href="/dashboard/accounts">
              <motion.button
                className="relative inline-flex items-center gap-3 px-6 py-4 bg-forest text-mint-light rounded-2xl font-medium shadow-xl overflow-hidden group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-sage to-forest-dark"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {listeningCount > 0 ? "Open music services" : "Let&apos;s go"}
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Animated status cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <motion.div
          className="bg-sage/10 rounded-2xl border border-sage/30 p-6 relative overflow-hidden group"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ scale: 1.02, borderColor: "rgba(127, 168, 143, 0.5)" }}
        >
          <motion.div
            className="absolute -right-10 -top-10 w-32 h-32 bg-sage rounded-full opacity-0 group-hover:opacity-20"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <div className="flex items-start gap-3 relative z-10">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-sage flex-shrink-0" />
            </motion.div>
            <div>
              <h4 className="font-semibold text-forest-dark mb-2">
                What&apos;s live
              </h4>
              <p className="text-moss text-sm leading-relaxed">
                {listeningCount > 0
                  ? `Stats, time patterns, presets, and mood chat — plus group sessions with a join code. ${listeningCount.toLocaleString()} plays stored.`
                  : "Account ready. Link Spotify to unlock patterns, presets, and group sessions."}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-mint/25 rounded-2xl border border-sage/35 p-6 relative overflow-hidden group"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.02, borderColor: "rgba(127, 168, 143, 0.55)" }}
        >
          <motion.div
            className="absolute -left-10 -bottom-10 w-32 h-32 bg-sage rounded-full opacity-0 group-hover:opacity-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          <div className="flex items-start gap-3 relative z-10">
            <motion.div
              animate={{
                y: [0, -5, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Users className="w-6 h-6 text-forest-dark flex-shrink-0" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-forest-dark mb-2">
                Group session
              </h4>
              <p className="text-moss text-sm leading-relaxed mb-4">
                Share a code, build a queue together, vote — the host plays on
                their Spotify. Lobby updates live.
              </p>
              <Link
                href="/dashboard/sessions"
                className="inline-flex items-center gap-2 text-sm font-medium text-forest-dark hover:text-sage"
              >
                Open group session
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress indicator */}
      <motion.div
        className="relative bg-cream rounded-2xl border border-forest/10 p-6 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sage" />
            <h4 className="font-semibold text-forest-dark">Your progress</h4>
          </div>
          <span className="text-sm text-moss">
            {listeningCount > 0 ? "You’re set" : "Get started"}
          </span>
        </div>

        <div className="relative h-3 bg-mint/30 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-sage to-forest rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: listeningCount > 0 ? "100%" : "33%" }}
            transition={{ duration: 1.5, delay: 0.7, type: "spring" }}
          />
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/50 to-transparent rounded-full"
            animate={{ x: ["0%", "300%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: listeningCount > 0 ? "100%" : "33%" }}
          />
        </div>

        <p className="text-xs text-moss mt-2">
          {listeningCount > 0 ? (
            <>
              Spotify linked and plays stored — explore solo stats below, or
              start a{" "}
              <Link
                href="/dashboard/sessions"
                className="font-medium text-sage underline decoration-sage/40 underline-offset-2 hover:text-forest-dark"
              >
                group session
              </Link>{" "}
              when you’re together.
            </>
          ) : (
            <>
              Account created → <strong>Connect music</strong> → Solo + group
              modes unlock
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
