"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Music2, Users, Radio, Zap, Clock, Repeat, Play, Pause } from "lucide-react";
import { Logo } from "./figma-logo";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "motion/react";

function WaveBar({
  delay,
  isPlaying,
}: {
  delay: number;
  isPlaying: boolean;
}) {
  return (
    <motion.div
      className="w-1 rounded-full"
      style={{ backgroundColor: "#8fd4b8" }}
      animate={{
        height: isPlaying ? ["12px", "24px", "12px"] : "12px",
      }}
      transition={{
        duration: 0.6,
        repeat: isPlaying ? Infinity : 0,
        delay: delay,
        ease: "easeInOut",
      }}
    />
  );
}

export function FigmaMarketingHome() {
  const { scrollYProgress } = useScroll();
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Parallax effects
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  
  // Smooth cursor following
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - window.innerWidth / 2);
      cursorY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorX, cursorY]);

  return (
    <div className="min-h-screen bg-navy overflow-hidden relative">
      {/* Glowing gradient orbs — soft sage */}
      <motion.div
        className="fixed top-20 right-20 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(77, 143, 110, 0.35) 0%, rgba(156, 172, 84, 0.22) 50%, transparent 70%)",
          x: useTransform(cursorXSpring, (x) => x * 0.05),
          y: useTransform(cursorYSpring, (y) => y * 0.05),
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="fixed bottom-20 left-20 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(95, 168, 138, 0.3) 0%, rgba(151, 205, 151, 0.22) 50%, transparent 70%)",
          x: useTransform(cursorXSpring, (x) => x * -0.03),
          y: useTransform(cursorYSpring, (y) => y * -0.03),
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      {/* Animated grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <motion.div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(77, 143, 110, 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(77, 143, 110, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
          animate={{
            backgroundPosition: ["0px 0px", "50px 50px"],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Header with glass morphism */}
      <motion.header
        className="border-b backdrop-blur-xl sticky top-0 z-50"
        style={{
          borderColor: "rgba(77, 143, 110, 0.22)",
          backgroundColor: "rgba(28, 38, 32, 0.85)"
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            {/* Playful play/pause button */}
            <motion.button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-electric-blue/10 hover:bg-electric-blue/20 transition-colors border border-electric-blue/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-0.5">
                <WaveBar delay={0} isPlaying={isPlaying} />
                <WaveBar delay={0.1} isPlaying={isPlaying} />
                <WaveBar delay={0.2} isPlaying={isPlaying} />
                <WaveBar delay={0.15} isPlaying={isPlaying} />
              </div>
              {isPlaying ? (
                <Pause className="w-3 h-3 text-cyan-bright" />
              ) : (
                <Play className="w-3 h-3 text-cyan-bright" />
              )}
            </motion.button>
            <Link
              href="/login"
              className="text-slate-light hover:text-cyan-bright transition-colors text-sm sm:text-base font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero with 3D-ish effects */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-20 sm:pb-32">
        <motion.div className="absolute inset-0 pointer-events-none">
          {/* Floating music symbols with glow */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl"
              style={{
                left: `${15 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                filter: "drop-shadow(0 0 10px currentColor)",
                color: i % 3 === 0 ? "#4d8f6e" : i % 3 === 1 ? "#5fa88a" : "#9cac54",
                opacity: 0.2,
              }}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 10, -10, 0],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            >
              ♪
            </motion.div>
          ))}
        </motion.div>

        <div className="max-w-4xl relative z-10">
          <motion.div style={{ y: y1, opacity }}>
            <motion.h1
              className="text-6xl sm:text-7xl md:text-8xl mb-8 leading-none"
              initial={{ opacity: 0, y: 50, rotateX: -15 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <motion.span
                className="inline-block bg-gradient-to-r from-cyan-bright via-electric-blue to-purple bg-clip-text text-transparent"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{ filter: "drop-shadow(0 0 20px rgba(77, 143, 110, 0.45))" }}
              >
                Skip{" "}
              </motion.span>
              <motion.span
                className="inline-block text-slate-light"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                it.{" "}
              </motion.span>
              <motion.span
                className="inline-block bg-gradient-to-r from-orange via-orange-bright to-cyan bg-clip-text text-transparent"
                whileHover={{ scale: 1.05 }}
                style={{ filter: "drop-shadow(0 0 20px rgba(200, 107, 84, 0.45))" }}
              >
                Loop{" "}
              </motion.span>
              <motion.span
                className="inline-block text-slate-light"
                whileHover={{ scale: 1.05, rotate: -5 }}
              >
                it.{" "}
              </motion.span>
              <br />
              <motion.span
                className="inline-block bg-gradient-to-r from-purple via-orange-bright to-cyan-bright bg-clip-text text-transparent"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
                style={{ filter: "drop-shadow(0 0 28px rgba(156, 172, 84, 0.45))" }}
              >
                We&apos;re watching.
              </motion.span>
            </motion.h1>
          </motion.div>

          <motion.p
            className="text-lg sm:text-xl text-slate-light mb-10 leading-relaxed max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{ y: y2 }}
          >
            That song you play at 2am but skip at 9am? The one you loop 6 times
            then forget for months? PeaPod sees it all. No prompts, no vibes —
            just raw listening behavior.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <Link href="/signup">
              <motion.button
                className="relative w-full sm:w-auto px-10 py-5 rounded-2xl font-semibold text-lg overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, #4d8f6e 0%, #5fa88a 45%, #97cd97 100%)",
                  boxShadow: "0 0 40px rgba(77, 143, 110, 0.45), inset 0 0 20px rgba(255, 255, 255, 0.08)",
                }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 52px rgba(77, 143, 110, 0.55), inset 0 0 28px rgba(255, 255, 255, 0.12)" }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2 text-navy">
                  Join beta
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </span>
              </motion.button>
            </Link>

            <Link href="/login">
              <motion.button
                className="w-full sm:w-auto px-10 py-5 border-2 border-electric-blue/40 rounded-2xl font-semibold text-lg backdrop-blur-sm bg-electric-blue/5"
                style={{ color: "#8fd4b8" }}
                whileHover={{ 
                  scale: 1.05, 
                  borderColor: "rgba(77, 143, 110, 0.75)",
                  backgroundColor: "rgba(77, 143, 110, 0.12)",
                  boxShadow: "0 0 28px rgba(77, 143, 110, 0.28)"
                }}
                whileTap={{ scale: 0.98 }}
              >
                Sign in
              </motion.button>
            </Link>
          </motion.div>

          {/* Interactive stats cards with glassmorphism */}
          <motion.div
            className="grid grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            {[
              { icon: Clock, label: "Time context", gradient: "from-cyan to-electric-blue", color: "#5fa88a" },
              { icon: Repeat, label: "Loop detection", gradient: "from-purple to-orange", color: "#9cac54" },
              { icon: Zap, label: "Skip patterns", gradient: "from-orange to-orange-bright", color: "#c86b54" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="relative backdrop-blur-xl rounded-2xl p-5 border cursor-pointer overflow-hidden group"
                style={{
                  backgroundColor: "rgba(28, 38, 32, 0.55)",
                  borderColor: "rgba(77, 143, 110, 0.22)"
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.1 }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -5,
                  borderColor: "rgba(77, 143, 110, 0.45)",
                  boxShadow: "0 20px 40px rgba(77, 143, 110, 0.18)"
                }}
              >
                {/* Gradient overlay on hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
                />

                <motion.div
                  className="relative z-10"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <item.icon className="w-7 h-7 mb-3" style={{ 
                    filter: "drop-shadow(0 0 10px currentColor)",
                    color: item.color
                  }} />
                </motion.div>
                <p className="text-xs text-slate-light font-medium relative z-10">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features — dark cards, sage accents */}
      <section className="relative py-24 sm:py-40 overflow-hidden">
        {/* Animated scanline effect */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{
            background: "linear-gradient(0deg, transparent 0%, rgba(77, 143, 110, 0.35) 50%, transparent 100%)",
            height: "200%",
          }}
          animate={{ y: ["-50%", "0%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl sm:text-6xl md:text-7xl mb-6">
              <span className="bg-gradient-to-r from-cyan-bright via-electric-blue to-purple bg-clip-text text-transparent">
                Three modes,
              </span>
              <br />
              <span className="text-slate-light">zero bullshit</span>
            </h2>
            <p className="text-slate-light mb-20 text-base sm:text-lg max-w-2xl">
              Not all at once. Building this piece by piece. Real features over
              fake promises.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[
              {
                icon: Music2,
                title: "Solo",
                desc: "Midnight loops aren't morning commutes. Context-aware queues that know what time you actually want what.",
                status: "Shipping",
                gradient: "from-cyan to-electric-blue",
              },
              {
                icon: Users,
                title: "Car / crew",
                desc: "Three people, three libraries, one aux cord. Democratic blending without the loudest person winning.",
                status: "Next",
                gradient: "from-purple to-violet",
              },
              {
                icon: Radio,
                title: "Room / party",
                desc: "Live voting, queue requests, host veto power. Turn your living room into a working music democracy.",
                status: "Soon",
                gradient: "from-orange to-orange-bright",
                color: "#c86b54",
                shadow: "rgba(200, 107, 84, 0.28)"
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="relative group"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <motion.div
                  className="backdrop-blur-xl bg-navy-light/50 rounded-3xl p-8 border border-electric-blue/20 h-full cursor-pointer relative overflow-hidden"
                  whileHover={{
                    scale: 1.03,
                    borderColor: "rgba(77, 143, 110, 0.45)",
                    boxShadow: "0 30px 60px rgba(77, 143, 110, 0.22)",
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Gradient overlay on hover */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl`}
                    transition={{ duration: 0.3 }}
                  />

                  <div className="relative z-10">
                    <motion.div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} bg-opacity-20 flex items-center justify-center mb-6`}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      style={{ 
                        boxShadow: `0 0 30px ${feature.shadow || (i === 0 ? "rgba(95, 168, 138, 0.28)" : "rgba(156, 172, 84, 0.28)")}`
                      }}
                    >
                      <feature.icon className="w-8 h-8" style={{ 
                        filter: "drop-shadow(0 0 10px currentColor)",
                        color: feature.color || (i === 0 ? "#5fa88a" : "#9cac54")
                      }} />
                    </motion.div>

                    <h3 className="text-2xl sm:text-3xl mb-4 font-bold text-white">{feature.title}</h3>
                    <p className="text-slate-light leading-relaxed mb-6 text-sm sm:text-base">
                      {feature.desc}
                    </p>

                    <motion.span
                      className={`inline-block text-sm px-4 py-2 bg-gradient-to-r ${feature.gradient} rounded-full font-medium`}
                      style={{ color: "#101814" }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {feature.status}
                    </motion.span>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — soft sage glow */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
        <motion.div
          className="relative backdrop-blur-xl bg-navy-light/50 rounded-[3rem] p-12 sm:p-20 border border-electric-blue/30 shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{
            boxShadow: "0 0 90px rgba(77, 143, 110, 0.22), inset 0 0 80px rgba(77, 143, 110, 0.04)"
          }}
        >
          {/* Animated iridescent blobs */}
          <motion.div
            className="absolute -right-32 -top-32 w-96 h-96 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(156, 172, 84, 0.35) 0%, rgba(77, 143, 110, 0.2) 50%, transparent 70%)",
            }}
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
              x: [0, 50, 0],
              y: [0, -50, 0],
            }}
            transition={{ duration: 15, repeat: Infinity }}
          />
          <motion.div
            className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(151, 205, 151, 0.35) 0%, rgba(95, 168, 138, 0.2) 50%, transparent 70%)",
            }}
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{ duration: 12, repeat: Infinity }}
          />

          <div className="max-w-2xl relative z-10">
            <motion.h2
              className="text-5xl sm:text-6xl md:text-7xl mb-8 font-bold"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-white">Early access =</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-bright via-electric-blue to-neon-green bg-clip-text text-transparent">
                better data
              </span>
            </motion.h2>
            <motion.p
              className="text-base sm:text-lg text-slate-light mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Join now, sync Spotify, let it run. By the time pattern learning
              goes live, you&apos;ll have months of listening data. Better patterns,
              better queues.
            </motion.p>

            <Link href="/signup">
              <motion.button
                className="relative px-12 py-6 rounded-2xl font-bold text-lg overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #4d8f6e 0%, #5fa88a 45%, #97cd97 100%)",
                  boxShadow: "0 0 52px rgba(77, 143, 110, 0.45), inset 0 0 28px rgba(255, 255, 255, 0.08)",
                  color: "#101814"
                }}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 0 68px rgba(77, 143, 110, 0.5), inset 0 0 36px rgba(255, 255, 255, 0.12)"
                }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  Get in now
                  <motion.span
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    ⚡
                  </motion.span>
                </span>
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-electric-blue/20 py-10 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          <p className="text-slate-light text-sm">PeaPod · Music that gets it</p>
          <motion.div
            className="flex items-center gap-2 text-cyan-bright text-xs"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-cyan-bright"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ boxShadow: "0 0 10px currentColor" }}
            />
            Live
          </motion.div>
        </div>
      </footer>
    </div>
  );
}