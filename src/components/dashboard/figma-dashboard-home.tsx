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
import { MoodChatPanel } from "@/components/dashboard/mood-chat-panel";
import { SoloPresetPlaylists } from "@/components/dashboard/solo-preset-playlists";
import type {
  RecentPlay,
  TimePatterns,
  TopArtist,
  TopTrack,
} from "@/types/listening";
import type { PhaseInfo } from "@/lib/data/phase-detection";
import type { ForgottenTrack } from "@/lib/data/forgotten-tracks";
import type { SongOfTheDayResult } from "@/lib/data/song-of-the-day";

function formatHourUtcLabel(h: number) {
  return `${h.toString().padStart(2, "0")}:00 UTC`;
}

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
  timePatterns,
  vibeLine,
  phaseInfo,
  forgottenTracks,
  songOfDay,
}: {
  firstName: string;
  listeningCount: number;
  recentPlays: RecentPlay[];
  topTracks: TopTrack[];
  topArtists: TopArtist[];
  timePatterns: TimePatterns | null;
  vibeLine: string | null;
  phaseInfo: PhaseInfo | null;
  forgottenTracks: ForgottenTrack[];
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
        {listeningCount > 0 && vibeLine ? (
          <p className="mt-3 text-sm text-sage sm:text-base">{vibeLine}</p>
        ) : null}

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
          <h2 className="font-display text-2xl font-semibold text-forest-dark sm:text-3xl">
            Your listening{" "}
            <span className="text-lg font-normal text-moss sm:text-xl">
              (solo)
            </span>
          </h2>

          {/* Phase detection card */}
          {phaseInfo ? (
            <motion.div
              className="rounded-3xl border border-sage/30 bg-gradient-to-br from-sage/10 to-mint/20 p-6 shadow-md sm:p-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sage" aria-hidden />
                <h3 className="text-lg font-semibold text-forest-dark">
                  Your current phase
                </h3>
              </div>
              <p className="text-base font-medium text-forest-dark">
                {phaseInfo.phase}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {phaseInfo.topArtistsRecent.slice(0, 5).map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-forest-dark"
                  >
                    {a}
                  </span>
                ))}
              </div>
              {phaseInfo.similarity < 0.5 ? (
                <p className="mt-3 text-xs text-moss">
                  Your recent taste has shifted from your usual patterns —
                  exploring something new.
                </p>
              ) : (
                <p className="mt-3 text-xs text-moss">
                  Staying consistent with your core taste.
                </p>
              )}
            </motion.div>
          ) : null}

          {/* Forgotten favorites card */}
          {forgottenTracks.length > 0 ? (
            <motion.div
              className="rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-md sm:p-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-rust" aria-hidden />
                <h3 className="text-lg font-semibold text-forest-dark">
                  Forgotten favorites
                </h3>
              </div>
              <p className="mb-4 text-xs text-moss">
                Songs you used to love but haven&apos;t played in a while.
              </p>
              <ul className="space-y-3">
                {forgottenTracks.map((t) => (
                  <li
                    key={`${t.trackName}-${t.artistName}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-forest-dark">
                        {t.trackName}
                      </p>
                      <p className="truncate text-xs text-moss">
                        {t.artistName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-moss">
                      {t.playCount}× · {t.daysSinceLastListen}d ago
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null}

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

          {timePatterns ? (
            <div className="rounded-3xl border border-forest/10 bg-white/80 p-6 shadow-md sm:p-8">
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-sage" aria-hidden />
                <h3 className="text-lg font-semibold text-forest-dark">
                  When you listen
                </h3>
              </div>
              <p className="mb-4 text-xs text-moss">
                Based on stored play times in UTC (not your local timezone).
              </p>
              {timePatterns.peakHourUtc !== null ||
              timePatterns.peakWeekdayDow !== null ? (
                <p className="mb-4 text-sm text-forest-dark">
                  {timePatterns.peakHourUtc !== null ? (
                    <>
                      Peaks around{" "}
                      <span className="font-medium">
                        {formatHourUtcLabel(timePatterns.peakHourUtc)}
                      </span>
                    </>
                  ) : null}
                  {timePatterns.peakHourUtc !== null &&
                  timePatterns.peakWeekdayDow !== null
                    ? " · "
                    : null}
                  {timePatterns.peakWeekdayDow !== null ? (
                    <>
                      Most plays on{" "}
                      <span className="font-medium">
                        {
                          timePatterns.weekdayUtc[timePatterns.peakWeekdayDow]
                            ?.label
                        }
                      </span>
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="mb-4 text-sm text-moss">
                  Add more plays to see time-of-day and weekday patterns.
                </p>
              )}
              <div className="mb-6 flex h-24 items-end gap-px sm:gap-0.5">
                {timePatterns.hourlyUtc.map((n, h) => {
                  const max = Math.max(...timePatterns.hourlyUtc, 1);
                  const pct = max > 0 ? (n / max) * 100 : 0;
                  return (
                    <div
                      key={h}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${formatHourUtcLabel(h)}: ${n} plays`}
                    >
                      <div
                        className="w-full min-w-[2px] rounded-t bg-sage/80"
                        style={{ height: `${Math.max(pct, n > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-moss sm:text-xs">
                <span>00 UTC</span>
                <span>12 UTC</span>
                <span>23 UTC</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {timePatterns.weekdayUtc.map((w) => {
                  const max = Math.max(
                    ...timePatterns.weekdayUtc.map((x) => x.count),
                    1,
                  );
                  const pct = max > 0 ? (w.count / max) * 100 : 0;
                  return (
                    <div
                      key={w.dow}
                      className="flex min-w-[2.5rem] flex-1 flex-col items-center gap-1"
                    >
                      <div className="flex h-12 w-full items-end justify-center rounded-md bg-mint/20 px-1">
                        <div
                          className="w-full max-w-[1.25rem] rounded-t bg-sage/90"
                          style={{
                            height: `${Math.max(pct, w.count > 0 ? 12 : 0)}%`,
                          }}
                          title={`${w.label}: ${w.count} plays`}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-moss">
                        {w.label}
                      </span>
                    </div>
                  );
                })}
              </div>
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

          <SoloPresetPlaylists />

          <MoodChatPanel />

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
