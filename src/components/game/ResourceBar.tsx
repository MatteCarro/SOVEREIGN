"use client";

import { Coins, Shield, Sparkles, Zap, Activity } from "lucide-react";
import { CountryState } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const HINTS = {
  treasury: "Tesoro: fondi disponibili per azioni e investimenti.",
  stability: "Stabilità: quanto il paese è lontano dalla crisi interna.",
  influence: "Influenza: la capacità diplomatica di convincere altri paesi.",
  readiness: "Prontezza militare: livello operativo delle forze armate.",
  ap: "Punti azione: quante mosse puoi fare in questo turno.",
};

export function ResourceBar({ country }: { country: CountryState }) {
  const s = country.stats;
  const items = [
    { icon: <Coins size={12} />, value: formatNumber(s.treasury), label: "Tesoro", hint: HINTS.treasury, tone: s.treasury < 60 ? "text-danger" : "text-foreground" },
    { icon: <Activity size={12} />, value: Math.round(s.stability), label: "Stabilità", hint: HINTS.stability, tone: s.stability < 30 ? "text-danger" : s.stability < 50 ? "text-warning" : "text-foreground" },
    { icon: <Sparkles size={12} />, value: Math.round(s.influence), label: "Influenza", hint: HINTS.influence, tone: "text-foreground" },
    { icon: <Shield size={12} />, value: Math.round(s.militaryReadiness), label: "Prontezza", hint: HINTS.readiness, tone: "text-foreground" },
    { icon: <Zap size={12} />, value: s.actionPoints, label: "PA", hint: HINTS.ap, tone: s.actionPoints === 0 ? "text-danger" : "text-accent" },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map((item) => (
        <div
          key={item.label}
          title={item.hint}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface/70 px-2 py-1"
        >
          <span className="text-muted">{item.icon}</span>
          <span className={`font-mono text-xs ${item.tone}`}>{item.value}</span>
          <span className="hidden text-[9px] uppercase tracking-wide text-faint xl:inline">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
