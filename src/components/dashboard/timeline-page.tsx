"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Disc3,
  Loader2,
  Music,
  Radio,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

type TimelineEvent = {
  id: string;
  type: "listen" | "session" | "song_of_day";
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  timestamp: string;
  data: Record<string, unknown>;
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "listen":
      return <Music className="h-4 w-4 text-[#1DB954]" />;
    case "session":
      return <Users className="h-4 w-4 text-sage" />;
    case "song_of_day":
      return <Disc3 className="h-4 w-4 text-rust" />;
    default:
      return <Radio className="h-4 w-4 text-moss" />;
  }
}

function eventDescription(event: TimelineEvent): string {
  switch (event.type) {
    case "listen":
      return `listened to ${event.data.trackName as string} by ${event.data.artistName as string}`;
    case "session": {
      const members = event.data.memberCount as number;
      const status = event.data.status as string;
      return `hosted a session with ${members} ${members === 1 ? "person" : "people"}${status === "ended" ? " (ended)" : ""}`;
    }
    case "song_of_day":
      return `was curated a daily pick: ${event.data.trackName as string} by ${event.data.artistName as string}`;
    default:
      return "did something";
  }
}

export function TimelinePageClient() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/timeline");
      const data = await res.json();
      setEvents(data.events ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="font-display text-3xl font-semibold text-forest-dark sm:text-4xl">
          Timeline
        </h1>
        <p className="mt-2 max-w-xl text-base text-moss">
          What your friends are listening to — respects everyone&apos;s privacy settings.
        </p>
      </motion.div>

      <motion.div
        className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-lg sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {events.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="mx-auto mb-4 h-10 w-10 text-moss/30" />
            <p className="text-sm text-moss">
              No activity yet. Add friends to see their listening here.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute bottom-0 left-5 top-0 w-px bg-forest/10" />

            <ul className="space-y-0">
              {events.map((event, idx) => (
                <motion.li
                  key={event.id}
                  className="relative flex gap-4 pb-6"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  {/* Node */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-forest/10 bg-white shadow-sm">
                    <EventIcon type={event.type} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm text-forest-dark">
                      <span className="font-semibold">{event.displayName}</span>{" "}
                      <span className="text-moss">{eventDescription(event)}</span>
                    </p>
                    {event.type === "song_of_day" && event.data.reason ? (
                      <p className="mt-1 text-xs italic text-rust/80">
                        "{event.data.reason as string}"
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-moss/70">
                      {timeAgo(event.timestamp)}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
