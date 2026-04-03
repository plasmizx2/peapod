"use client";

import { useId } from "react";

type Props = {
  /** Pixel size (width & height). */
  size?: number;
  className?: string;
  /** Tailwind classes for the “PeaPod” wordmark (default: dark on light UI). */
  wordmarkClassName?: string;
  /** Show wordmark next to the mark. */
  withWordmark?: boolean;
};

/**
 * PeaPod mark: open pod (masked ellipse) + sound arcs + pea “gem” —
 * reads as both “something growing” and “something resonating.”
 */
export function PeaPodLogo({
  size = 40,
  className = "",
  wordmarkClassName = "text-stone-900",
  withWordmark = false,
}: Props) {
  const uid = useId();
  const grad = `peapod-grad-${uid}`;
  const gradInner = `peapod-inner-${uid}`;
  const maskId = `peapod-open-${uid}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden={withWordmark ? true : undefined}
      aria-label={withWordmark ? undefined : "PeaPod"}
      role="img"
    >
      <defs>
        <linearGradient id={grad} x1="32" y1="6" x2="32" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F0DD" />
          <stop offset="0.4" stopColor="#9CAC54" />
          <stop offset="1" stopColor="#345C32" />
        </linearGradient>
        <radialGradient id={gradInner} cx="32" cy="38" r="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A7F0DD" />
          <stop offset="0.5" stopColor="#9CAC54" />
          <stop offset="1" stopColor="#97CD97" />
        </radialGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="white" />
          {/* Punch open the top — the pod “mouth” */}
          <ellipse cx="32" cy="14" rx="16" ry="11" fill="black" />
        </mask>
      </defs>

      {/* Pod body: full ellipse minus top bite */}
      <ellipse
        cx="32"
        cy="40"
        rx="22"
        ry="26"
        fill={`url(#${grad})`}
        mask={`url(#${maskId})`}
        opacity={0.95}
      />

      {/* Inner pea + pulse rings */}
      <circle cx="32" cy="42" r="9" fill={`url(#${gradInner})`} opacity={0.95} />
      <circle cx="32" cy="42" r="3.2" fill="#345C32" opacity={0.45} />

      <path
        d="M32 18c-6 0-10 4-10 9 0 3 1.5 5 3 6.5"
        fill="none"
        stroke="#A7F0DD"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={0.85}
      />
      <path
        d="M32 18c6 0 10 4 10 9 0 3-1.5 5-3 6.5"
        fill="none"
        stroke="#A7F0DD"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={0.85}
      />

      {/* Stem / leaf — asymmetry so it feels hand-tuned */}
      <path
        d="M32 6c2-2 6-3 9-1-2 4-6 5-9 3z"
        fill="#9CAC54"
        opacity={0.95}
      />
      <path
        d="M33 7.5c3-4 8-5 12-3"
        fill="none"
        stroke="#A7F0DD"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={0.5}
      />
    </svg>
  );

  if (!withWordmark) {
    return mark;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span
        className={`font-display text-xl font-semibold tracking-tight sm:text-2xl ${wordmarkClassName}`}
      >
        PeaPod
      </span>
    </span>
  );
}
