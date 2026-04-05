"use client";

import { useState } from "react";
import {
  Shield,
  Users,
  Music,
  Link2,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import { motion } from "motion/react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  onboardingCompleted: boolean;
  createdAt: string;
  providerCount: number;
  listeningCount: number;
};

export function AdminDashboardClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name?.toLowerCase() ?? "").includes(q)
    );
  });

  const totalUsers = users.length;
  const onboarded = users.filter((u) => u.onboardingCompleted).length;
  const withSpotify = users.filter((u) => u.providerCount > 0).length;
  const totalListens = users.reduce((s, u) => s + u.listeningCount, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-sage" />
          <h1 className="font-display text-3xl font-semibold text-forest-dark sm:text-4xl">
            Admin
          </h1>
        </div>
        <p className="mt-2 text-base text-moss">
          Overview of all PeaPod users and activity.
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {[
          { icon: <Users className="h-5 w-5" />, label: "Total users", value: totalUsers },
          { icon: <CheckCircle className="h-5 w-5" />, label: "Onboarded", value: onboarded },
          { icon: <Link2 className="h-5 w-5" />, label: "Spotify linked", value: withSpotify },
          { icon: <Music className="h-5 w-5" />, label: "Total listens", value: totalListens.toLocaleString() },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-forest/10 bg-cream p-5 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2 text-sage">
              {card.icon}
              <span className="text-xs font-medium text-moss">{card.label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-forest-dark">
              {card.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Search + user table */}
      <motion.div
        className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-lg sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-forest-dark">Users</h2>
          <div className="relative ml-auto max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full rounded-xl border border-forest/15 bg-white py-2 pl-9 pr-3 text-sm text-forest-dark placeholder:text-moss/50 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10 text-xs font-semibold uppercase tracking-wide text-moss">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2 text-center">Onboarded</th>
                <th className="px-3 py-2 text-right">Spotify</th>
                <th className="px-3 py-2 text-right">Listens</th>
                <th className="px-3 py-2 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => (
                <motion.tr
                  key={u.id}
                  className="border-b border-forest/5 transition-colors hover:bg-sage/5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <td className="px-3 py-3">
                    <div>
                      <p className="font-medium text-forest-dark">
                        {u.name?.trim() || u.email.split("@")[0]}
                      </p>
                      <p className="text-xs text-moss">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.role === "admin"
                          ? "bg-sage/20 text-forest-dark"
                          : "bg-moss/10 text-moss"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {u.onboardingCompleted ? (
                      <CheckCircle className="mx-auto h-4 w-4 text-[#1DB954]" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-moss/40" />
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-moss">
                    {u.providerCount}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-moss">
                    {u.listeningCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-moss">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-moss"
                  >
                    No users match your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
