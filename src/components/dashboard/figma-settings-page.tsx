"use client";

import { useEffect, useState } from "react";
import {
  User,
  Eye,
  EyeOff,
  Globe,
  Users,
  Lock,
  Save,
  Loader2,
  Check,
  Copy,
  Hash,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Profile = {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  friendCode: string | null;
  phoneNumber: string | null;
  listeningVisibility: string;
  sessionHistoryVisible: boolean;
};

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", icon: Globe, desc: "Anyone can see your listening" },
  { value: "friends_only", label: "Friends only", icon: Users, desc: "Only accepted friends" },
  { value: "private", label: "Private", icon: Lock, desc: "Only you" },
];

export function FigmaSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [listeningVisibility, setListeningVisibility] = useState("friends_only");
  const [sessionHistoryVisible, setSessionHistoryVisible] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setDisplayName(data.displayName ?? "");
        setBio(data.bio ?? "");
        setFriendCode(data.friendCode ?? "");
        setPhoneNumber(data.phoneNumber ?? "");
        setListeningVisibility(data.listeningVisibility);
        setSessionHistoryVisible(data.sessionHistoryVisible);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
          friendCode: friendCode.trim() || undefined,
          phoneNumber: phoneNumber.trim() || null,
          listeningVisibility,
          sessionHistoryVisible,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Failed to save");
        return;
      }
      const updated = await res.json() as Profile;
      setFriendCode(updated.friendCode ?? friendCode);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

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
        <h1 className="font-display text-4xl font-semibold text-forest-dark sm:text-5xl">
          Settings
        </h1>
        <p className="mt-2 text-base text-moss sm:text-lg">
          Your profile and privacy preferences.
        </p>
      </motion.div>

      {/* Profile section */}
      <motion.div
        className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-lg sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-sage" />
          <h2 className="text-lg font-semibold text-forest-dark">Profile</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="display-name"
              className="mb-1.5 block text-sm font-medium text-forest-dark"
            >
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              maxLength={50}
              className="w-full rounded-xl border border-forest/15 bg-white px-4 py-3 text-forest-dark placeholder:text-moss/50 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="mb-1.5 block text-sm font-medium text-forest-dark"
            >
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A few words about your taste..."
              maxLength={160}
              rows={3}
              className="w-full resize-none rounded-xl border border-forest/15 bg-white px-4 py-3 text-forest-dark placeholder:text-moss/50 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
            <p className="mt-1 text-right text-xs text-moss">
              {bio.length}/160
            </p>
          </div>

          <div>
            <label
              htmlFor="friend-code"
              className="mb-1.5 block text-sm font-medium text-forest-dark"
            >
              Friend code
            </label>
            <p className="mb-2 text-xs text-moss">
              Others can add you with this code. Customize it if you want.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss/50" />
                <input
                  id="friend-code"
                  type="text"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                  placeholder="AUTO-GENERATED"
                  maxLength={16}
                  className="w-full rounded-xl border border-forest/15 bg-white py-3 pl-10 pr-4 font-mono tracking-widest text-forest-dark placeholder:text-moss/50 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(friendCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-forest/15 bg-white px-4 py-3 text-sm font-medium text-forest-dark hover:bg-mint/20"
              >
                {codeCopied ? <Check className="h-4 w-4 text-[#1DB954]" /> : <Copy className="h-4 w-4" />}
                {codeCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="phone-number"
              className="mb-1.5 block text-sm font-medium text-forest-dark"
            >
              Phone number
              <span className="ml-1 text-xs font-normal text-moss">(optional)</span>
            </label>
            <p className="mb-2 text-xs text-moss">
              Friends can find you by phone. Only used for friend discovery.
            </p>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss/50" />
              <input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full rounded-xl border border-forest/15 bg-white py-3 pl-10 pr-4 text-forest-dark placeholder:text-moss/50 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Privacy section */}
      <motion.div
        className="rounded-3xl border border-forest/10 bg-cream p-6 shadow-lg sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="mb-6 flex items-center gap-2">
          <Eye className="h-5 w-5 text-sage" />
          <h2 className="text-lg font-semibold text-forest-dark">Privacy</h2>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm font-medium text-forest-dark">
              Who can see your listening activity?
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = listeningVisibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setListeningVisibility(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                      active
                        ? "border-sage bg-sage/15 text-forest-dark shadow-sm"
                        : "border-forest/10 bg-white/60 text-moss hover:border-sage/40"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-sage" : "text-moss"}`} />
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-moss">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-forest/10 bg-white/60 p-4">
            <div className="flex items-center gap-3">
              {sessionHistoryVisible ? (
                <Eye className="h-5 w-5 text-sage" />
              ) : (
                <EyeOff className="h-5 w-5 text-moss" />
              )}
              <div>
                <p className="text-sm font-medium text-forest-dark">
                  Session history visible to friends
                </p>
                <p className="text-xs text-moss">
                  Past group sessions show on your profile
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSessionHistoryVisible(!sessionHistoryVisible)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                sessionHistoryVisible ? "bg-sage" : "bg-moss/30"
              }`}
            >
              <motion.div
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
                animate={{ left: sessionHistoryVisible ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveProfile()}
          className="inline-flex items-center gap-2 rounded-2xl bg-forest px-6 py-3 font-medium text-mint-light shadow-lg transition-all hover:bg-forest-dark hover:shadow-xl disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saved ? (
            <Check className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
        {saveError ? (
          <p className="mt-3 text-sm text-rust">{saveError}</p>
        ) : null}
      </motion.div>

      {/* Coming soon */}
      <motion.div
        className="rounded-2xl border border-sage/30 bg-sage/10 p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h4 className="mb-4 text-sm font-semibold text-forest-dark sm:text-base">
          Coming next
        </h4>
        <ul className="space-y-3 text-sm text-moss">
          {[
            "Profile photo upload",
            "Friend activity timeline",
            "Notification preferences",
            "Data export",
          ].map((item, idx) => (
            <motion.li
              key={item}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
            >
              <motion.span
                className="h-2 w-2 flex-shrink-0 rounded-full bg-sage"
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
