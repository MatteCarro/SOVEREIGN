"use client";

import { ShieldAlert, Info, AlertTriangle, Bot } from "lucide-react";
import { PrivateBriefing } from "@/lib/types";

const SEVERITY = {
  info: { icon: <Info size={13} />, border: "border-border", text: "text-info" },
  warning: { icon: <AlertTriangle size={13} />, border: "border-warning/40", text: "text-warning" },
  critical: { icon: <ShieldAlert size={13} />, border: "border-danger/50", text: "text-danger" },
};

export function PrivateBriefingCard({ briefing }: { briefing: PrivateBriefing }) {
  const s = SEVERITY[briefing.severity];
  return (
    <article className={`rounded-md border ${s.border} bg-surface/60 p-2.5 animate-fade-in`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${s.text}`}>{s.icon}</span>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold leading-snug">{briefing.title}</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{briefing.content}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-faint">
            <span>Turno {briefing.turn} · SOLO PER I TUOI OCCHI</span>
            {briefing.source === "ai" && (
              <span className="flex items-center gap-0.5 text-info"><Bot size={9} /> analisi AI</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
