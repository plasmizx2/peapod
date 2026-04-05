"use client";

import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import {
  Sparkles,
  Clock,
  BarChart3,
  Music,
  Mic2,
  Users,
  Settings2,
  ListMusic,
  MessageSquare,
  Disc3,
} from "lucide-react";
import type {
  RecentPlay,
  TimePatterns,
  TopArtist,
  TopTrack,
} from "@/types/listening";
import type { PhaseInfo } from "@/lib/data/phase-detection";
import type { ForgottenTrack } from "@/lib/data/forgotten-tracks";

function formatHourUtcLabel(h: number) {
  return `${h.toString().padStart(2, "0")}:00`;
}

function modeLabel(mode: string | null): string {
  if (!mode) return "—";
  const labels: Record<string, string> = {
    manual: "Manual",
    equal_play: "Equal play",
    lean_driver: "Lean driver",
    hype: "Party (hype)",
  };
  return labels[mode] ?? mode;
}

export function VisualIdentityPageClient({
  listeningCount,
  vibeLine,
  phaseInfo,
  timePatterns,
  topTracks,
  topArtists,
  forgottenTracks,
  analyticsStats,
  userFirstName,
}: {
  listeningCount: number;
  vibeLine: string | null;
  phaseInfo: PhaseInfo | null;
  timePatterns: TimePatterns | null;
  topTracks: TopTrack[];
  topArtists: TopArtist[];
  forgottenTracks: ForgottenTrack[];
  analyticsStats: any;
  userFirstName?: string;
}) {
  const chartData = timePatterns?.hourlyUtc.map((count, hour) => ({
    hour: formatHourUtcLabel(hour),
    plays: count,
  })) || [];

  const dayData = timePatterns?.weekdayUtc.map((d) => ({
    day: d.label,
    plays: d.count,
  })) || [];

  const titlePrefix = userFirstName ? `${userFirstName}'s` : "Visual";
  const descPrefix = userFirstName ? `${userFirstName}'s` : "Your";

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="font-display text-4xl font-semibold text-forest-dark sm:text-5xl">
          {titlePrefix} Identity
        </h1>
        <p className="mt-2 max-w-xl text-base text-moss">
          {descPrefix} personal music DNA. Everything gathered from listening patterns, beautifully visualized.
        </p>
      </motion.div>

      {/* Hero Banner: The Vibe & Phase */}
      <motion.div
        className="relative overflow-hidden rounded-[2rem] bg-forest-dark text-mint-light p-8 sm:p-12 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sage/20 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="flex items-center gap-2 rounded-full border border-mint/20 bg-mint/10 px-4 py-1.5 text-sm tracking-wide text-mint">
            <Sparkles className="h-4 w-4" />
            CURRENT PHASE
          </div>
          <h2 className="font-display text-3xl font-medium sm:text-5xl">
            {phaseInfo?.phase || "Exploring new sounds"}
          </h2>
          <p className="max-w-2xl text-lg text-mint/80 sm:text-xl">
            {vibeLine || "Not enough data to establish a signature vibe yet."}
          </p>
          
          {phaseInfo && phaseInfo.topArtistsRecent.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 pt-4">
              <span className="mr-2 self-center text-sm font-medium text-mint/60">Anchored by</span>
              {phaseInfo.topArtistsRecent.slice(0, 4).map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {listeningCount === 0 && (
        <div className="rounded-2xl border border-dashed border-forest/20 bg-cream p-12 text-center text-moss">
          <Music className="mx-auto mb-4 h-8 w-8 opacity-50" />
          <p>Sync your Spotify data on the Home page to start tracking your identity!</p>
        </div>
      )}

      {listeningCount > 0 && (
        <>
          {/* Time & Rhythm Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              className="rounded-3xl border border-forest/10 bg-white p-8 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="mb-8 flex items-center gap-2">
                <Clock className="h-6 w-6 text-sage" />
                <h3 className="font-display text-2xl font-medium text-forest-dark">The 24-Hour Clock</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7fa88f" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#7fa88f" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ stroke: '#7fa88f', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="plays" 
                      stroke="#4a6b57" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPlays)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-center text-sm text-moss font-medium">Activity throughout the day (UTC)</p>
            </motion.div>

            <motion.div
              className="rounded-3xl border border-forest/10 bg-white p-8 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-8 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-sage" />
                <h3 className="font-display text-2xl font-medium text-forest-dark">Weekly Rhythm</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#8b9a91', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f0f4f2'}} contentStyle={{ borderRadius: '1rem', border: 'none' }}/>
                    <Bar dataKey="plays" radius={[6, 6, 0, 0]}>
                      {dayData.map((entry, index) => (
                        <Cell key={"cell-" + index} fill={entry.plays === Math.max(...dayData.map(d=>d.plays)) ? '#4a6b57' : '#7fa88f'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Tracks */}
            <motion.div
              className="rounded-3xl border border-forest/10 bg-white/80 p-8 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="mb-6 flex items-center gap-2">
                <Music className="h-6 w-6 text-[#1DB954]" aria-hidden />
                <h3 className="font-display text-2xl font-semibold text-forest-dark">
                  {userFirstName ? `${userFirstName}'s` : "Your"} Heavy Rotation
                </h3>
              </div>
              {topTracks.length > 0 ? (
                <ul className="space-y-4">
                  {topTracks.map((t, i) => (
                    <li key={`top-track-${i}`} className="flex justify-between items-center bg-cream/50 rounded-2xl p-4 transition-colors hover:bg-sage/10">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage/20 text-forest-dark font-bold">
                          {i + 1}
                        </div>
                        <div className="truncate">
                          <p className="truncate font-medium text-forest-dark text-lg">
                            {t.trackName}
                          </p>
                          <p className="truncate text-sm text-moss">
                            {t.artistName}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="block font-bold text-forest">{t.plays}</span>
                        <span className="text-xs uppercase tracking-wider text-moss">Plays</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-moss">Not enough data to calculate top tracks.</p>
              )}
            </motion.div>

            {/* Top Artists & Forgotten */}
            <div className="flex flex-col gap-6">
              <motion.div
                className="rounded-3xl border border-forest/10 bg-white/80 p-8 shadow-sm flex-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="mb-6 flex items-center gap-2">
                  <Mic2 className="h-6 w-6 text-sage" aria-hidden />
                  <h3 className="font-display text-2xl font-semibold text-forest-dark">
                    Top Artists
                  </h3>
                </div>
                {topArtists.length > 0 ? (
                  <ul className="space-y-3">
                    {topArtists.map((a, i) => (
                      <li key={`top-artist-${i}`} className="flex items-center justify-between border-b border-forest/5 pb-3 last:border-0 last:pb-0">
                        <span className="font-medium text-forest-dark text-lg">
                          <span className="text-sage/60 mr-3 text-sm">{i + 1}</span> {a.artistName}
                        </span>
                        <span className="rounded-full bg-forest/5 px-3 py-1 text-sm font-medium text-moss">
                          {a.plays} plays
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-moss">Not enough data to calculate top artists.</p>
                )}
              </motion.div>
              
              {forgottenTracks.length > 0 && (
                <motion.div
                  className="rounded-3xl bg-forest p-8 shadow-md"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-mint" aria-hidden />
                    <h3 className="text-lg font-semibold text-mint-light">
                      Forgotten favorites
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {forgottenTracks.slice(0, 3).map((t) => (
                      <li
                        key={`${t.trackName}-${t.artistName}`}
                        className="flex items-baseline justify-between gap-2 border-b border-mint/10 pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-mint-light">
                            {t.trackName}
                          </p>
                          <p className="truncate text-xs text-mint/60">
                            {t.artistName}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-mint/60">
                          {t.daysSinceLastListen}d ago
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Boring Stats Footer */}
      <motion.div 
        className="pt-12 mt-12 border-t border-forest/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="mb-6 font-display text-xl font-medium text-forest-dark">App Telemetry & Usage</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { icon: <Music className="h-4 w-4" />, label: "Plays synced", value: analyticsStats.totalPlaysSynced.toLocaleString() },
            { icon: <Users className="h-4 w-4" />, label: "Sessions joined", value: analyticsStats.totalSessions },
            { icon: <Disc3 className="h-4 w-4" />, label: "Sessions hosted", value: analyticsStats.totalSessionsHosted },
            { icon: <ListMusic className="h-4 w-4" />, label: "Playlists generated", value: analyticsStats.playlistsGenerated },
            { icon: <MessageSquare className="h-4 w-4" />, label: "Mood prompts", value: analyticsStats.chatbotPromptsUsed },
            { icon: <BarChart3 className="h-4 w-4" />, label: "Sync jobs", value: analyticsStats.totalSyncJobs },
            { icon: <Clock className="h-4 w-4" />, label: "Avg session", value: analyticsStats.avgSessionDurationMins ? `${analyticsStats.avgSessionDurationMins}m` : "—" },
            { icon: <Settings2 className="h-4 w-4" />, label: "Queue mode", value: modeLabel(analyticsStats.mostUsedQueueMode) },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-forest/5 bg-white/50 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-sage">
                {card.icon}
                <span className="text-[10px] font-medium uppercase tracking-wider text-moss">{card.label}</span>
              </div>
              <p className="text-lg font-semibold tabular-nums text-forest-dark">{card.value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
