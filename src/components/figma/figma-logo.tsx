"use client";

import Link from "next/link";
import { motion } from "motion/react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const sizeMap = {
    sm: { container: 32, text: "text-lg" },
    md: { container: 40, text: "text-xl" },
    lg: { container: 48, text: "text-2xl" },
  };

  const s = sizeMap[size];

  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <svg
        width={s.container}
        height={s.container}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform group-hover:scale-105"
      >
        <defs>
          {/* Glossy gradient */}
          <linearGradient id="podGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Iridescent gradient for outline */}
          <linearGradient id="outlineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Glow effect */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glowing background circle */}
        <motion.circle
          cx="20"
          cy="20"
          r="18"
          fill="url(#podGradient)"
          opacity="0.15"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Vine/stem with gradient */}
        <motion.path
          d="M20 4 Q15 10, 15 16 T20 28"
          stroke="url(#podGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Left pod half - glossy */}
        <motion.ellipse
          cx="14"
          cy="20"
          rx="6"
          ry="9"
          fill="url(#podGradient)"
          opacity="0.8"
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: -15 }}
          transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.4 }}
        />

        {/* Right pod half - glossy */}
        <motion.ellipse
          cx="26"
          cy="20"
          rx="6"
          ry="9"
          fill="url(#podGradient)"
          opacity="0.8"
          initial={{ scale: 0, rotate: 15 }}
          animate={{ scale: 1, rotate: 15 }}
          transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.4 }}
        />

        {/* Peas inside - neon */}
        <motion.circle
          cx="20"
          cy="16"
          r="2.5"
          fill="#22d3ee"
          filter="url(#glow)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.3, type: "spring" }}
        />
        <motion.circle
          cx="20"
          cy="20"
          r="2.5"
          fill="#10b981"
          filter="url(#glow)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, duration: 0.3, type: "spring" }}
        />
        <motion.circle
          cx="20"
          cy="24"
          r="2.5"
          fill="#8b5cf6"
          filter="url(#glow)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, duration: 0.3, type: "spring" }}
        />

        {/* Pod outline with iridescent effect */}
        <motion.path
          d="M8 20 Q8 10, 14 10 L26 10 Q32 10, 32 20 Q32 30, 26 30 L14 30 Q8 30, 8 20Z"
          stroke="url(#outlineGradient)"
          strokeWidth="2"
          fill="none"
          opacity="0.8"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        />
      </svg>

      {showText && (
        <motion.span
          className="font-display font-bold tracking-tight bg-gradient-to-r from-cyan via-electric-blue to-purple bg-clip-text text-transparent"
          style={{ fontSize: s.text }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          PeaPod
        </motion.span>
      )}
    </Link>
  );
}
