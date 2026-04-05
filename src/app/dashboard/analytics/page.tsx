import { redirect } from "next/navigation";
import {
  BarChart3,
  Clock,
  ListMusic,
  MessageSquare,
  Music,
  Users,
  Disc3,
  Settings2,
} from "lucide-react";
import { auth } from "@/auth";
import { getUserAnalytics } from "@/lib/data/analytics";

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

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const stats = await getUserAnalytics(session.user.id);

  const cards = [
    {
      icon: <Music className="h-5 w-5" />,
      label: "Plays synced",
      value: stats.totalPlaysSynced.toLocaleString(),
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Sessions joined",
      value: stats.totalSessions,
    },
    {
      icon: <Disc3 className="h-5 w-5" />,
      label: "Sessions hosted",
      value: stats.totalSessionsHosted,
    },
    {
      icon: <ListMusic className="h-5 w-5" />,
      label: "Playlists generated",
      value: stats.playlistsGenerated,
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: "Mood prompts",
      value: stats.chatbotPromptsUsed,
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Sync jobs",
      value: stats.totalSyncJobs,
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: "Avg session",
      value: stats.avgSessionDurationMins
        ? `${stats.avgSessionDurationMins} min`
        : "—",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Avg group size",
      value: stats.avgSessionMembers ?? "—",
    },
    {
      icon: <Settings2 className="h-5 w-5" />,
      label: "Fav queue mode",
      value: modeLabel(stats.mostUsedQueueMode),
    },
    {
      icon: <ListMusic className="h-5 w-5" />,
      label: "Tracks queued",
      value: stats.totalTracksQueued.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-dark">
          Analytics
        </h1>
        <p className="mt-2 max-w-xl text-moss">
          Your aggregate PeaPod stats — counts only, no raw listening content
          stored here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-forest/10 bg-cream p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2 text-sage">
              {card.icon}
              <span className="text-xs font-medium text-moss">
                {card.label}
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-forest-dark">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
