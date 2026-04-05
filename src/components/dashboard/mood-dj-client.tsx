"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles, User, RefreshCw, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type MoodTrack = {
  position: number;
  trackName: string;
  artistName: string;
  score: number;
};

type MoodOk = {
  ok: true;
  playlistId: string;
  title: string;
  preset: string;
  explanation: string;
  tracks: MoodTrack[];
  intentLabel: string;
};

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  result?: MoodOk;
  isAdjusting?: boolean;
};

export function MoodDjClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "ai",
      text: "What's the vibe? Describe how you feel, what you're doing, or the exact energy you're looking for, and I'll spin up the perfect queue.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: data?.ok ? data.explanation : (typeof data?.error === "string" ? data.error : "Request failed"),
        result: data?.ok ? (data as MoodOk) : undefined,
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", text: "Network error — I couldn't process that right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function adjust(msgId: string, playlistId: string, adjustment: "lift" | "stay" | "shift") {
    setLoading(true);
    setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, isAdjusting: true } : m));
    
    try {
      const res = await fetch("/api/chat/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustment,
          lastPlaylistId: playlistId,
        }),
      });
      const data = await res.json();
      
      if (res.ok && data?.ok) {
        setMessages((prev) => [
          ...prev.map(m => m.id === msgId ? { ...m, isAdjusting: false } : m),
          {
            id: Date.now().toString(),
            role: "ai",
            text: `Re-tuned the queue: ${data.explanation}`,
            result: data as MoodOk,
          }
        ]);
      } else {
        setMessages((prev) => [
           ...prev.map(m => m.id === msgId ? { ...m, isAdjusting: false } : m),
           { id: Date.now().toString(), role: "ai", text: typeof data?.error === "string" ? data.error : "Failed to adjust queue." }
        ]);
      }
    } catch {
      setMessages((prev) => [
         ...prev.map(m => m.id === msgId ? { ...m, isAdjusting: false } : m),
         { id: Date.now().toString(), role: "ai", text: "Network error while adjusting." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col rounded-3xl border border-forest/10 bg-white/80 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-forest/10 bg-mint-light/50 px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-forest-dark">PeaPod AI</h2>
          <p className="text-xs font-medium text-moss">Your intelligent DJ. Powered by your patterns.</p>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
                className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div className="flex items-center gap-2 px-2">
                {msg.role === "ai" ? (
                  <span className="text-xs font-bold uppercase tracking-wider text-sage">AI DJ</span>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider text-forest-dark/50">You</span>
                )}
              </div>
              
              <div
                className={`p-4 text-[15px] leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-tr-sm bg-forest text-mint-light"
                    : "rounded-2xl rounded-tl-sm border border-forest/10 bg-cream text-forest-dark"
                }`}
              >
                {msg.text}
              </div>

              {/* Rich Playlist Card */}
              {msg.result && (
                <div className="mt-2 w-full min-w-[280px] max-w-sm rounded-2xl border border-sage/20 bg-mint-light/30 overflow-hidden shadow-sm">
                  <div className="bg-sage/10 px-4 py-3 border-b border-sage/20 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-moss/80">{msg.result.intentLabel}</span>
                    <h4 className="font-bold text-forest-dark leading-tight">{msg.result.title}</h4>
                  </div>
                  <div className="p-4">
                    {msg.result.tracks.length > 0 ? (
                      <ol className="flex flex-col gap-3">
                        {msg.result.tracks.map((t) => (
                          <li key={`${t.position}-${t.trackName}`} className="flex items-start gap-3">
                            <span className="text-xs font-medium text-moss/50 w-4 text-right pt-[2px]">{t.position}</span>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-forest-dark leading-tight">{t.trackName}</span>
                              <span className="text-[11px] text-moss line-clamp-1">{t.artistName}</span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-[13px] text-moss italic">No playable tracks matched.</p>
                    )}
                  </div>
                  <div className="border-t border-sage/20 bg-sage/5 px-4 py-3 pb-4">
                    <span className="block mb-2 text-[10px] font-bold uppercase tracking-widest text-moss/70">Tune It</span>
                    <div className="flex items-center gap-2 w-full">
                      {(
                        [
                          ["lift", "Lift"],
                          ["stay", "Stay"],
                          ["shift", "Shift"],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          disabled={msg.isAdjusting || loading}
                          onClick={() => adjust(msg.id, msg.result!.playlistId, key)}
                          className="flex-1 shrink-0 rounded-xl bg-white border border-sage/30 px-2 py-1.5 text-xs font-semibold text-forest-dark transition hover:bg-sage/10 disabled:opacity-40 disabled:hover:bg-white"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mr-auto flex max-w-[85%] items-start gap-2"
            >
              <div className="flex items-center gap-2 p-4 text-[15px] rounded-2xl rounded-tl-sm border border-forest/10 bg-cream text-moss">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Spinning up records...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="px-6 py-5 bg-white/50 border-t border-forest/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(prompt);
          }}
          className="flex gap-2 relative bg-transparent"
        >
          <input
            type="text"
            disabled={loading}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. moody instrumental hip hop to code to..."
            className="w-full h-[52px] rounded-2xl border border-forest/20 bg-white pl-5 pr-14 text-[15px] text-forest-dark shadow-sm transition placeholder:text-moss/60 focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="absolute right-2 top-1.5 bottom-1.5 flex w-10 items-center justify-center rounded-xl bg-forest text-mint-light transition hover:bg-forest-dark focus:outline-none focus:ring-2 focus:ring-forest/50 disabled:bg-forest/30 disabled:text-mint-light"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium uppercase tracking-widest text-moss/50">
          <Layers className="h-3 w-3" /> Creates a live Spotify queue
        </div>
      </div>
    </div>
  );
}
