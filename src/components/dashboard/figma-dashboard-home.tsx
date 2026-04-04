"use client";

import Link from "next/link";
import { Clock, Mic2, Music, ArrowRight, Sparkles, Zap, TrendingUp } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useState } from "react";
import type { RecentPlay, TopArtist, TopTrack } from "@/types/listening";

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
  recentPlays,
  topTracks,
  topArtists,
}: {
  firstName: string;
  listeningCount: number;
  recentPlays: RecentPlay[];
  topTracks: TopTrack[];
  topArtists: TopArtist[];
}) {
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
      </motion.div>

      {listeningCount > 0 ? (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-2xl font-semibold text-forest-dark sm:text-3xl">
            Your listening
          </h2>

          {recentPlays.length > 0 ? (
            <div className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-lg sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-sage" aria-hidden />
                <h3 className="text-lg font-semibold text-forest-dark">
                  Recent plays
                </h3>
              </div>
              <ul className="divide-y divide-forest/10">
                {recentPlays.map((p) => (
                  <li
                    key={`${p.listenedAtIso}-${p.trackName}`}
                    className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-baseline sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-forest-dark">
                        {p.trackName}
                      </p>
                      <p className="text-sm text-moss">
                        {p.artistName}
                        {p.albumName ? ` · ${p.albumName}` : null}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-moss sm:text-sm">
                      {formatPlayedAt(p.listenedAtIso)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            {topTracks.length > 0 ? (
              <div className="rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-md sm:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <Music className="h-5 w-5 text-[#1DB954]" aria-hidden />
                  <h3 className="text-lg font-semibold text-forest-dark">
                    Top songs
                  </h3>
                </div>
                <ol className="list-decimal space-y-3 pl-5 text-moss">
                  {topTracks.map((t, i) => (
                    <li key={`top-track-${i}`} className="pl-1">
                      <span className="font-medium text-forest-dark">
                        {t.trackName}
                      </span>
                      <span className="text-moss"> — {t.artistName}</span>
                      <span className="ml-2 text-xs text-moss">
                        ({t.plays}×)
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {topArtists.length > 0 ? (
              <div className="rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-md sm:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <Mic2 className="h-5 w-5 text-sage" aria-hidden />
                  <h3 className="text-lg font-semibold text-forest-dark">
                    Top artists
                  </h3>
                </div>
                <ol className="list-decimal space-y-3 pl-5 text-moss">
                  {topArtists.map((a, i) => (
                    <li key={`top-artist-${i}`} className="pl-1">
                      <span className="font-medium text-forest-dark">
                        {a.artistName}
                      </span>
                      <span className="ml-2 text-xs text-moss">
                        ({a.plays} plays)
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <p className="text-center text-sm text-moss">
            <Link
              href="/dashboard/accounts"
              className="font-medium text-sage underline decoration-sage/40 underline-offset-2 hover:text-forest-dark"
            >
              Music services
            </Link>{" "}
            — sync pulls your latest 50 plays from Spotify.
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
                  ? `Data in: ${listeningCount} plays stored. Patterns & presets next.`
                  : "Accounts ✓ Spotify rolling in. Pattern detection next. Weekly updates."}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-rust/10 rounded-2xl border border-rust/30 p-6 relative overflow-hidden group"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.02, borderColor: "rgba(217, 117, 86, 0.5)" }}
        >
          <motion.div
            className="absolute -left-10 -bottom-10 w-32 h-32 bg-rust rounded-full opacity-0 group-hover:opacity-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          <div className="flex items-start gap-3 relative z-10">
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Zap className="w-6 h-6 text-rust flex-shrink-0" />
            </motion.div>
            <div>
              <h4 className="font-semibold text-forest-dark mb-2">
                Coming soon
              </h4>
              <p className="text-moss text-sm leading-relaxed">
                Skip tracking, time-based patterns, car mode blending. Real
                features.
              </p>
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
            {listeningCount > 0 ? "Step 2 of 3" : "Step 1 of 3"}
          </span>
        </div>

        <div className="relative h-3 bg-mint/30 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-sage to-forest rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: listeningCount > 0 ? "66%" : "33%" }}
            transition={{ duration: 1.5, delay: 0.7, type: "spring" }}
          />
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/50 to-transparent rounded-full"
            animate={{ x: ["0%", "300%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: listeningCount > 0 ? "66%" : "33%" }}
          />
        </div>

        <p className="text-xs text-moss mt-2">
          {listeningCount > 0 ? (
            <>
              Account created → <strong>Plays syncing</strong> → Patterns next
            </>
          ) : (
            <>
              Account created → <strong>Connect music</strong> → Start listening
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
