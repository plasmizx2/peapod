"use client";

import Link from "next/link";
import { Music, ArrowRight, Sparkles, Zap, TrendingUp } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useState } from "react";

export function FigmaDashboardHome({ firstName }: { firstName: string }) {
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
          Now connect Spotify and let the learning begin.
        </p>
      </motion.div>

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
              Connect Spotify
            </h3>
            <p className="text-sm sm:text-base text-moss mb-6 leading-relaxed">
              30 seconds to link your account. Then we pull listening history,
              analyze patterns, and start building your personal music brain.
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
                  Let&apos;s go
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
                Accounts ✓ Spotify rolling in. Pattern detection next. Weekly
                updates.
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
          <span className="text-sm text-moss">Step 1 of 3</span>
        </div>

        <div className="relative h-3 bg-mint/30 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-sage to-forest rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "33%" }}
            transition={{ duration: 1.5, delay: 0.7, type: "spring" }}
          />
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/50 to-transparent rounded-full"
            animate={{ x: ["0%", "300%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: "33%" }}
          />
        </div>

        <p className="text-xs text-moss mt-2">
          Account created → <strong>Connect music</strong> → Start listening
        </p>
      </motion.div>
    </div>
  );
}
