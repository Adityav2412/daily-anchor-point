// Inline SVG illustrations + Akshay avatar. Beige / warm brown palette.
// Colors use semantic tokens where possible, plus a warm brown #8B6F47 + amber #F5A623.

import type { SVGProps } from "react";

const BROWN = "#8B6F47";
const AMBER = "#F5A623";
const SKIN = "#E8C9A6";
const HAIR = "#2C2218";
const SHIRT = "#8B6F47";

/* ---------------- Akshay avatar (minimalist, dark hair, casual) ---------------- */
export function AkshayAvatar({
  size = 56,
  waving = false,
  className,
}: { size?: number; waving?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-label="Akshay"
      role="img"
    >
      {/* soft amber halo */}
      <circle cx="32" cy="32" r="30" fill={AMBER} opacity="0.16" />
      {/* shoulders / shirt */}
      <path d="M10 60 C 14 46, 50 46, 54 60 Z" fill={SHIRT} />
      {/* neck */}
      <rect x="28" y="36" width="8" height="8" rx="2" fill={SKIN} />
      {/* face */}
      <circle cx="32" cy="28" r="13" fill={SKIN} />
      {/* hair — short, side sweep */}
      <path
        d="M19 27 C 19 16, 45 14, 45 26 C 45 22, 38 18, 33 20 C 28 22, 24 22, 21 24 Z"
        fill={HAIR}
      />
      {/* eyes */}
      <circle cx="27.5" cy="29" r="1.3" fill={HAIR} />
      <circle cx="36.5" cy="29" r="1.3" fill={HAIR} />
      {/* smile */}
      <path d="M28 34 Q 32 37 36 34" stroke={HAIR} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* waving hand */}
      {waving && (
        <g
          style={{
            transformOrigin: "52px 44px",
            animation: "akshay-wave 1.6s ease-in-out infinite",
          }}
        >
          <circle cx="52" cy="44" r="4.5" fill={SKIN} />
          <rect x="49" y="44" width="6" height="9" rx="3" fill={SHIRT} />
        </g>
      )}
      <style>{`
        @keyframes akshay-wave {
          0%, 100% { transform: rotate(-10deg); }
          25% { transform: rotate(18deg); }
          50% { transform: rotate(-6deg); }
          75% { transform: rotate(14deg); }
        }
      `}</style>
    </svg>
  );
}

/* ---------------- Tab illustrations ---------------- */

// Today — sun + character with books
export function TodayScene(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 80" fill="none" {...props}>
      {/* sun */}
      <circle cx="22" cy="26" r="11" fill={AMBER} />
      <g stroke={AMBER} strokeWidth="2" strokeLinecap="round">
        <line x1="22" y1="6" x2="22" y2="11" />
        <line x1="22" y1="41" x2="22" y2="46" />
        <line x1="2" y1="26" x2="7" y2="26" />
        <line x1="37" y1="26" x2="42" y2="26" />
        <line x1="8" y1="12" x2="11" y2="15" />
        <line x1="33" y1="37" x2="36" y2="40" />
        <line x1="36" y1="12" x2="33" y2="15" />
        <line x1="11" y1="37" x2="8" y2="40" />
      </g>
      {/* ground line */}
      <line x1="0" y1="72" x2="120" y2="72" stroke={BROWN} strokeWidth="1.2" opacity="0.4" />
      {/* sitting character */}
      <circle cx="78" cy="44" r="7" fill={SKIN} />
      <path d="M71 42 C 71 36, 85 36, 85 42 Z" fill={HAIR} />
      <path d="M68 72 C 70 60, 86 60, 88 72 Z" fill={SHIRT} />
      {/* book stack */}
      <rect x="92" y="62" width="22" height="4" rx="1" fill={BROWN} />
      <rect x="94" y="58" width="20" height="4" rx="1" fill={AMBER} />
      <rect x="93" y="54" width="21" height="4" rx="1" fill={BROWN} opacity="0.8" />
    </svg>
  );
}

// Habits — plant growing
export function HabitsPlant(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 80" fill="none" {...props}>
      {/* pot */}
      <path d="M22 56 L 58 56 L 54 74 L 26 74 Z" fill={BROWN} />
      <rect x="20" y="53" width="40" height="5" rx="1" fill={BROWN} opacity="0.8" />
      {/* stem */}
      <path d="M40 56 C 40 42, 40 30, 40 22" stroke="#5B7A4A" strokeWidth="2.2" strokeLinecap="round" />
      {/* leaves */}
      <path d="M40 38 C 30 36, 24 30, 26 22 C 34 22, 40 28, 40 38 Z" fill="#7BA05B" />
      <path d="M40 30 C 50 28, 56 22, 54 14 C 46 14, 40 20, 40 30 Z" fill="#9CC07C" />
      {/* top bud */}
      <circle cx="40" cy="20" r="3.5" fill={AMBER} />
    </svg>
  );
}

// Study — open book + stars
export function StudyBook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 80" fill="none" {...props}>
      {/* book */}
      <path d="M10 30 L 50 38 L 50 70 L 10 62 Z" fill={BROWN} />
      <path d="M90 30 L 50 38 L 50 70 L 90 62 Z" fill={BROWN} opacity="0.85" />
      <path d="M14 36 L 48 42" stroke="#FFFDF7" strokeWidth="1" opacity="0.6" />
      <path d="M14 44 L 48 50" stroke="#FFFDF7" strokeWidth="1" opacity="0.6" />
      <path d="M14 52 L 48 58" stroke="#FFFDF7" strokeWidth="1" opacity="0.6" />
      <path d="M86 36 L 52 42" stroke="#FFFDF7" strokeWidth="1" opacity="0.6" />
      <path d="M86 44 L 52 50" stroke="#FFFDF7" strokeWidth="1" opacity="0.6" />
      <path d="M86 52 L 52 58" stroke="#FFFDF7" strokeWidth="1" opacity="0.6" />
      {/* stars */}
      <Star x={20} y={14} size={8} />
      <Star x={50} y={8} size={10} />
      <Star x={80} y={16} size={7} />
    </svg>
  );
}

function Star({ x, y, size = 8 }: { x: number; y: number; size?: number }) {
  const s = size / 2;
  const d = `M${x} ${y - s} L${x + s * 0.4} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.4} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.4} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.4} ${y - s * 0.3} Z`;
  return <path d={d} fill={AMBER} />;
}

// Time — hourglass
export function TimeHourglass(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 80" fill="none" {...props}>
      <rect x="10" y="6" width="40" height="4" rx="1.5" fill={BROWN} />
      <rect x="10" y="70" width="40" height="4" rx="1.5" fill={BROWN} />
      <path d="M14 10 L 46 10 L 32 38 L 28 38 Z" fill={AMBER} opacity="0.85" />
      <path d="M14 70 L 46 70 L 34 50 L 26 50 Z" fill={AMBER} opacity="0.4" />
      <path d="M14 10 L 46 10 L 32 38 L 28 38 Z M 14 70 L 46 70 L 34 50 L 26 50 Z"
        stroke={BROWN} strokeWidth="1.6" fill="none" />
      {/* falling sand */}
      <line x1="30" y1="40" x2="30" y2="50" stroke={BROWN} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Stats — bar chart with star
export function StatsBars(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 80" fill="none" {...props}>
      <line x1="8" y1="68" x2="74" y2="68" stroke={BROWN} strokeWidth="1.2" />
      <rect x="14" y="48" width="10" height="20" rx="2" fill={BROWN} opacity="0.6" />
      <rect x="30" y="36" width="10" height="32" rx="2" fill={AMBER} opacity="0.8" />
      <rect x="46" y="22" width="10" height="46" rx="2" fill={BROWN} />
      <rect x="62" y="40" width="10" height="28" rx="2" fill={AMBER} opacity="0.6" />
      <Star x={51} y={14} size={11} />
    </svg>
  );
}

// Calendar with checkmark
export function CalendarCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 80" fill="none" {...props}>
      <rect x="10" y="16" width="60" height="54" rx="6" fill={BROWN} opacity="0.15" stroke={BROWN} strokeWidth="2" />
      <rect x="10" y="16" width="60" height="14" rx="6" fill={BROWN} />
      <rect x="22" y="10" width="4" height="12" rx="1.5" fill={BROWN} />
      <rect x="54" y="10" width="4" height="12" rx="1.5" fill={BROWN} />
      <path d="M24 50 L 36 60 L 58 38" stroke={AMBER} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Today tab widget illustrations ---------------- */

// Animated donut chart (pct 0..1)
export function DonutWidget({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct)) * c;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke={BROWN} strokeWidth="6" opacity="0.18" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={AMBER}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dasharray 600ms ease-out" }}
      />
      <circle cx="32" cy="32" r="14" fill={AMBER} opacity="0.15" />
    </svg>
  );
}

// Flame for streak
export function FlameIllustration({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 3 C 18 9, 24 11, 24 19 C 24 25, 20 29, 16 29 C 12 29, 8 25, 8 19 C 8 14, 12 12, 13 8 C 14 11, 16 11, 16 3 Z"
        fill={AMBER}
      />
      <path
        d="M16 13 C 17 16, 20 17, 20 21 C 20 24, 18 26, 16 26 C 14 26, 12 24, 12 21 C 12 18, 14 17, 15 15 Z"
        fill="#FFD27A"
      />
    </svg>
  );
}

// Quote marks decoration
export function QuoteMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M6 22 C 6 14, 12 10, 14 10 L 14 14 C 12 14, 10 17, 10 19 L 14 19 L 14 26 L 6 26 Z" fill={AMBER} opacity="0.85" />
      <path d="M18 22 C 18 14, 24 10, 26 10 L 26 14 C 24 14, 22 17, 22 19 L 26 19 L 26 26 L 18 26 Z" fill={BROWN} opacity="0.7" />
    </svg>
  );
}

// Pencil for "Aaj ka irada"
export function PencilIllustration({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M4 26 L 6 22 L 22 6 L 26 10 L 10 26 Z" fill={AMBER} />
      <path d="M22 6 L 26 10 L 28 8 L 24 4 Z" fill={BROWN} />
      <path d="M4 26 L 8 25 L 7 28 Z" fill={HAIR} />
    </svg>
  );
}
