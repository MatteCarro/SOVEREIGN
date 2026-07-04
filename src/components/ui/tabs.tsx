"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
  compact,
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode; badge?: number }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex gap-0.5 overflow-x-auto border-b border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 border-b-2 font-medium transition-colors",
            compact ? "px-2 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
            value === tab.id
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground",
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="ml-0.5 rounded-full bg-accent/20 px-1.5 text-[10px] text-accent">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
