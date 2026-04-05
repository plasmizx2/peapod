import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, Clock, Music } from "lucide-react";
import { auth } from "@/auth";
import { getSessionRecap, type RecapTrackRow } from "@/lib/sessions/recap";

type Props = { params: Promise<{ sessionId: string }> };

function TrackRow({
  rank,
  track,
  showVotes = false,
  showAdder = false,
}: {
  rank: number;
  track: RecapTrackRow;
  showVotes?: boolean;
  showAdder?: boolean;
}) {
  const isTop = rank === 1 && showVotes;
  return (
    <li
      className={`flex items-center gap-3 py-3 ${rank > 1 ? "border-t border-forest/5" : ""}`}
    >
      <span
        className={`w-6 shrink-0 text-center text-sm font-bold ${isTop ? "text-[#1DB954]" : "text-moss"}`}
      >
        {rank === 1 && showVotes ? "🏆" : `${rank}`}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-forest-dark">{track.trackName}</p>
        <p className="truncate text-xs text-moss">
          {track.artistName}
          {showAdder ? ` · added by ${track.addedByDisplayName}` : null}
        </p>
      </div>
      {showVotes && track.voteTotal !== 0 ? (
        <span
          className={`shrink-0 text-sm font-bold tabular-nums ${
            track.voteTotal > 0 ? "text-[#1DB954]" : "text-rust"
          }`}
        >
          {track.voteTotal > 0 ? `+${track.voteTotal}` : track.voteTotal}
        </span>
      ) : null}
    </li>
  );
}

export default async function SessionRecapPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recap = await getSessionRecap(sessionId, session.user.id);
  if (!recap) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-sm text-moss">
          <Link
            href="/dashboard/sessions"
            className="hover:text-forest-dark"
          >
            ← Sessions
          </Link>
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-forest-dark sm:text-5xl">
          Session recap
        </h1>
        <p className="mt-3 text-base text-moss">
          Hosted by {recap.hostDisplayName} · Code{" "}
          <span className="font-mono font-semibold tracking-widest text-forest-dark">
            {recap.joinCode}
          </span>
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            icon: <Music className="h-5 w-5" />,
            label: "Played",
            value: recap.playedTracks.length,
          },
          {
            icon: <Users className="h-5 w-5" />,
            label: "Listeners",
            value: recap.memberCount,
          },
          {
            icon: <Clock className="h-5 w-5" />,
            label: "Duration",
            value: recap.durationLabel,
          },
          {
            icon: <Music className="h-5 w-5" />,
            label: "Queued total",
            value: recap.totalQueued,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-forest/10 bg-cream p-4 text-center shadow-sm"
          >
            <div className="mb-1 flex justify-center text-moss">{stat.icon}</div>
            <p className="text-xl font-bold text-forest-dark">{stat.value}</p>
            <p className="text-xs text-moss">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Top voted */}
      {recap.topVotedTracks.length > 0 ? (
        <div className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-md sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#1DB954]" />
            <h2 className="font-display text-2xl font-semibold text-forest-dark">
              Top voted
            </h2>
          </div>
          <ol>
            {recap.topVotedTracks.map((t, i) => (
              <TrackRow key={t.queueItemId} rank={i + 1} track={t} showVotes />
            ))}
          </ol>
        </div>
      ) : null}

      {/* Played in order */}
      <div className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-md sm:p-8">
        <h2 className="font-display text-2xl font-semibold text-forest-dark">
          Played in order
        </h2>
        {recap.playedTracks.length === 0 ? (
          <p className="mt-4 text-sm text-moss">
            No tracks were marked as played in this session.
          </p>
        ) : (
          <ol className="mt-4">
            {recap.playedTracks.map((t, i) => (
              <TrackRow
                key={t.queueItemId}
                rank={i + 1}
                track={t}
                showVotes
                showAdder
              />
            ))}
          </ol>
        )}
      </div>

      {/* Member contributions */}
      {recap.members.some((m) => m.tracksAdded > 0) ? (
        <div className="rounded-3xl border border-sage/30 bg-sage/10 p-6 sm:p-8">
          <h2 className="mb-4 font-display text-xl font-semibold text-forest-dark">
            Who added what
          </h2>
          <ul className="space-y-2">
            {[...recap.members]
              .sort((a, b) => b.tracksAdded - a.tracksAdded)
              .map((m) => (
                <li key={m.userId} className="flex items-center justify-between text-sm">
                  <span className="text-forest-dark">{m.displayName}</span>
                  <span className="text-moss">
                    {m.tracksAdded} track{m.tracksAdded !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
