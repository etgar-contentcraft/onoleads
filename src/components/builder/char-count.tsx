"use client";

/**
 * CharCount — shows live character count with a recommended max.
 * Green/gray when within limit, red + warning when over (signals potential layout shift).
 */

interface CharCountProps {
  value: string;
  max: number;
  className?: string;
}

export function CharCount({ value, max, className = "" }: CharCountProps) {
  const count = (value || "").length;
  const isOver = count > max;
  const isWarning = count > max * 0.9 && !isOver;

  return (
    <span
      className={`text-[11px] tabular-nums select-none ${
        isOver
          ? "text-red-500 font-semibold"
          : isWarning
          ? "text-amber-500"
          : "text-[#9A969A]"
      } ${className}`}
    >
      {count}/{max}
      {isOver && " · עלול לגרום לתזוזה בעמוד ⚠️"}
    </span>
  );
}
