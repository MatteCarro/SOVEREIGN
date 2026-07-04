"use client";

import { MapMode } from "@/lib/client/gameStore";
import { MODE_LABELS, MODE_LEGEND } from "./mapColors";
import { cn } from "@/lib/utils";

export function MapLegend({
  mode,
  onModeChange,
  className,
}: {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-auto flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(MODE_LABELS) as MapMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
              mode === m
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-border bg-panel/80 text-muted hover:text-foreground",
            )}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-panel/80 px-2.5 py-1.5 backdrop-blur">
        {MODE_LEGEND[mode].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
