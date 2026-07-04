"use client";

import { Bot, CheckCircle2, XCircle } from "lucide-react";
import { GameView } from "@/lib/view";
import { EffectLog } from "@/lib/types";
import { ACTION_META } from "./actionMeta";

/** Latest turn report: what changed and why, effect by effect. */
export function TurnLog({ view }: { view: GameView }) {
  const report = view.resolutions[view.resolutions.length - 1];
  if (!report) {
    return (
      <p className="py-6 text-center text-xs text-muted">
        Il primo report apparirà dopo la risoluzione del turno.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-muted">
        Report del turno {report.turn} · {report.aiApplied ? (
          <span className="text-info">analisi AI applicata</span>
        ) : (
          <span>solo regole deterministiche{report.aiError ? " (AI non disponibile)" : ""}</span>
        )}
      </div>
      {report.narrativeSummary && (
        <blockquote className="rounded-md border-l-2 border-accent bg-surface/60 px-3 py-2 text-xs italic leading-relaxed text-foreground">
          <Bot size={11} className="mb-1 text-info" /> {report.narrativeSummary}
        </blockquote>
      )}
      {report.actionResults.map((result) => {
        const country = view.countries[result.countryId];
        const meta = ACTION_META[result.actionType];
        return (
          <div key={result.actionId} className="rounded-md border border-border bg-surface/60 p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {result.success ? (
                <CheckCircle2 size={12} className="text-success" />
              ) : (
                <XCircle size={12} className="text-danger" />
              )}
              {country?.flag} {country?.name}: {meta?.name ?? result.actionType}
              {result.targetCountryId && (
                <span className="text-muted">→ {view.countries[result.targetCountryId]?.name}</span>
              )}
            </div>
            {result.lines.map((line, index) => (
              <p key={index} className="mt-1 text-[11px] leading-relaxed text-muted">{line}</p>
            ))}
            <EffectList effects={result.effects} view={view} />
          </div>
        );
      })}
      {report.aiSignalEffects.length > 0 && (
        <div className="rounded-md border border-info/30 bg-info/5 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-info">
            <Bot size={12} /> Segnali diplomatici (AI, effetti limitati)
          </div>
          <EffectList effects={view.resolutions[view.resolutions.length - 1].aiSignalEffects} view={view} />
        </div>
      )}
      <details className="rounded-md border border-border bg-surface/40 p-2.5">
        <summary className="cursor-pointer text-[11px] text-muted">
          Effetti di sistema ({report.passiveEffects.length})
        </summary>
        <EffectList effects={report.passiveEffects} view={view} />
      </details>
    </div>
  );
}

export function EffectList({ effects, view }: { effects: EffectLog[]; view: GameView }) {
  if (effects.length === 0) return null;
  const name = (target: string) => {
    if (target === "world") return "Mondo";
    if (target.includes("|")) {
      const [a, b] = target.split("|");
      return `${view.countries[a]?.name ?? a} ↔ ${view.countries[b]?.name ?? b}`;
    }
    return view.countries[target]?.name ?? target;
  };
  return (
    <ul className="mt-1.5 space-y-0.5">
      {effects.slice(0, 40).map((effect, index) => (
        <li key={index} className="flex items-baseline gap-1.5 text-[10px] leading-relaxed">
          <span className={`shrink-0 font-mono ${effect.delta > 0 ? "text-success" : "text-danger"}`}>
            {effect.delta > 0 ? "+" : ""}{effect.delta}
          </span>
          <span className="text-foreground">{FIELD_LABELS[effect.field] ?? effect.field}</span>
          <span className="truncate text-faint">
            {name(effect.target)} — {effect.reason}
          </span>
        </li>
      ))}
      {effects.length > 40 && (
        <li className="text-[10px] text-faint">... e altri {effects.length - 40} effetti</li>
      )}
    </ul>
  );
}

const FIELD_LABELS: Record<string, string> = {
  treasury: "Tesoro",
  income: "Reddito",
  debt: "Debito",
  stability: "Stabilità",
  legitimacy: "Legittimità",
  influence: "Influenza",
  militaryReadiness: "Prontezza",
  militaryStrength: "Forza militare",
  research: "Ricerca",
  publicSupport: "Consenso",
  corruption: "Corruzione",
  tradeCapacity: "Commercio",
  sanctionPressure: "Sanzioni",
  nuclearPosture: "Postura nucleare",
  relation: "Relazione",
  tension: "Tensione",
  trust: "Fiducia",
  globalTension: "Tensione globale",
};
