"use client";

import { GameView } from "@/lib/view";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { useGameStore } from "@/lib/client/gameStore";
import { CountryStats } from "@/lib/types";

const ROWS: { field: keyof CountryStats; label: string; invert?: boolean }[] = [
  { field: "stability", label: "Stabilità" },
  { field: "legitimacy", label: "Legittimità" },
  { field: "publicSupport", label: "Consenso" },
  { field: "influence", label: "Influenza" },
  { field: "tradeCapacity", label: "Commercio" },
  { field: "research", label: "Ricerca" },
  { field: "militaryReadiness", label: "Prontezza" },
  { field: "militaryStrength", label: "Forza militare" },
  { field: "corruption", label: "Corruzione", invert: true },
  { field: "nuclearPosture", label: "Postura nucleare", invert: true },
];

export function CountryComparisonModal({ view }: { view: GameView }) {
  const { compareCountryId, setCompareCountryId } = useGameStore();
  if (!compareCountryId || !view.myCountryId) return null;
  const mine = view.countries[view.myCountryId];
  const other = view.countries[compareCountryId];
  if (!other) return null;

  return (
    <Dialog open onClose={() => setCompareCountryId(null)} wide>
      <DialogHeader
        title={`${mine.flag} ${mine.name} vs ${other.flag} ${other.name}`}
        subtitle="Confronto dei valori strategici noti pubblicamente."
      />
      <div className="p-5">
        <div className="space-y-2.5">
          {ROWS.map(({ field, label, invert }) => {
            const a = mine.stats[field];
            const b = other.stats[field];
            const aBetter = invert ? a < b : a > b;
            return (
              <div key={field} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex items-center justify-end gap-2">
                  <span className={`font-mono text-xs ${aBetter ? "text-success" : "text-muted"}`}>
                    {Math.round(a)}
                  </span>
                  <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-raised">
                    <div
                      className={`ml-auto h-full ${aBetter ? "bg-accent" : "bg-border-strong"}`}
                      style={{ width: `${a}%` }}
                    />
                  </div>
                </div>
                <span className="w-28 text-center text-[10px] uppercase tracking-wide text-muted">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-raised">
                    <div
                      className={`h-full ${!aBetter ? "bg-info" : "bg-border-strong"}`}
                      style={{ width: `${b}%` }}
                    />
                  </div>
                  <span className={`font-mono text-xs ${!aBetter ? "text-info" : "text-muted"}`}>
                    {Math.round(b)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[10px] text-faint">
          I valori di altri paesi sono stime pubbliche: per dossier dettagliati servono operazioni di intelligence.
        </p>
      </div>
    </Dialog>
  );
}
