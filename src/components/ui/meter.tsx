import * as React from "react";
import { cn } from "@/lib/utils";

/** Small labeled 0-100 bar with contextual color. */
export function Meter({
  label,
  value,
  hint,
  invert,
  className,
}: {
  label: string;
  value: number;
  /** Tooltip explanation (game concept). */
  hint?: string;
  /** true when high values are bad (corruption, tension...). */
  invert?: boolean;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const good = invert ? 100 - v : v;
  const color =
    good >= 60 ? "bg-success" : good >= 35 ? "bg-warning" : "bg-danger";
  return (
    <div className={cn("group relative", className)} title={hint}>
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="font-mono text-[11px] text-foreground">{Math.round(v)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
