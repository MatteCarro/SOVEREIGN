"use client";

import { pairKey } from "@/lib/types";
import { MapViewData } from "./mapColors";

export interface TooltipData {
  countryId: string;
  x: number;
  y: number;
}

const CONTROL_LABELS: Record<string, string> = {
  available: "Disponibile",
  player: "Giocatore",
  ai: "Controllato dall'AI",
  locked: "Non giocabile",
};

export function CountryTooltip({ data, tooltip }: { data: MapViewData; tooltip: TooltipData }) {
  const country = data.countries[tooltip.countryId];
  if (!country) return null;
  const rel = data.myCountryId
    ? data.relations[pairKey(country.id, data.myCountryId)]
    : undefined;

  return (
    <div
      className="pointer-events-none absolute z-20 w-56 rounded-lg border border-border-strong bg-panel/95 p-3 text-xs shadow-xl backdrop-blur"
      style={{
        left: Math.min(tooltip.x + 14, window.innerWidth - 260),
        top: tooltip.y + 10,
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-base leading-none">{country.flag}</span>
        <div>
          <div className="font-semibold text-foreground">{country.name}</div>
          <div className="text-[10px] text-muted">
            {country.capital} · {CONTROL_LABELS[country.control]}
          </div>
        </div>
      </div>
      <div className="mb-1.5 text-[11px] text-muted">
        {country.leader.title} <span className="text-foreground">{country.leader.name}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        <TooltipStat label="Stabilità" value={country.stats.stability} />
        <TooltipStat label="Economia" value={country.stats.tradeCapacity} />
        <TooltipStat label="Prontezza" value={country.stats.militaryReadiness} />
      </div>
      {rel && country.id !== data.myCountryId && (
        <div className="mt-1.5 border-t border-border pt-1.5 text-[11px]">
          <span className="text-muted">Relazione: </span>
          <span className={rel.relation >= 15 ? "text-success" : rel.relation <= -15 ? "text-danger" : "text-foreground"}>
            {rel.relation > 0 ? "+" : ""}{Math.round(rel.relation)}
          </span>
          <span className="ml-2 text-muted">Tensione: </span>
          <span className={rel.tension >= 50 ? "text-danger" : rel.tension >= 25 ? "text-warning" : "text-foreground"}>
            {Math.round(rel.tension)}
          </span>
        </div>
      )}
    </div>
  );
}

function TooltipStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-raised/70 px-1 py-0.5">
      <div className="font-mono text-foreground">{Math.round(value)}</div>
      <div className="text-[9px] text-muted">{label}</div>
    </div>
  );
}
