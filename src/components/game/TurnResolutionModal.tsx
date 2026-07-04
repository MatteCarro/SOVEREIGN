"use client";

import { Bot, Gavel } from "lucide-react";
import { GameView } from "@/lib/view";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/client/gameStore";
import { EffectList } from "./TurnLog";
import { ACTION_META } from "./actionMeta";

/** Shown once when a new turn resolution arrives. */
export function TurnResolutionModal({ view }: { view: GameView }) {
  const { showResolution, dismissResolution } = useGameStore();
  const report = view.resolutions[view.resolutions.length - 1];
  if (!showResolution || !report) return null;

  const myResults = report.actionResults.filter((r) => r.countryId === view.myCountryId);
  const otherResults = report.actionResults.filter((r) => r.countryId !== view.myCountryId);
  const newBriefings = view.briefings.filter((b) => b.turn === report.turn);

  return (
    <Dialog open onClose={dismissResolution} wide>
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Gavel size={16} className="text-accent" /> Turno {report.turn} risolto
          </span>
        }
        subtitle={`Inizia il turno ${view.turn}. Punti azione ripristinati.`}
      />
      <div className="space-y-4 p-5">
        {report.narrativeSummary && (
          <blockquote className="rounded-md border-l-2 border-info bg-info/5 px-3 py-2.5 text-sm italic leading-relaxed">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-medium not-italic text-info">
              <Bot size={11} /> ANALISI DIPLOMATICA {view.resolver.mode === "mock" && "(SIMULATA)"}
            </span>
            {report.narrativeSummary}
          </blockquote>
        )}

        {myResults.length > 0 && (
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
              Le tue azioni
            </h3>
            <div className="space-y-2">
              {myResults.map((result) => (
                <div key={result.actionId} className={`rounded-md border p-2.5 ${result.success ? "border-border bg-surface/60" : "border-danger/30 bg-danger/5"}`}>
                  <div className="text-xs font-medium">
                    {ACTION_META[result.actionType]?.name ?? result.actionType}
                    {result.targetCountryId && (
                      <span className="text-muted"> → {view.countries[result.targetCountryId]?.name}</span>
                    )}
                  </div>
                  {result.lines.map((line, index) => (
                    <p key={index} className="mt-0.5 text-[11px] text-muted">{line}</p>
                  ))}
                  <EffectList effects={result.effects} view={view} />
                </div>
              ))}
            </div>
          </section>
        )}

        {otherResults.length > 0 && (
          <details open={myResults.length === 0}>
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-faint">
              Azioni degli altri paesi ({otherResults.length})
            </summary>
            <div className="mt-2 space-y-2">
              {otherResults.map((result) => (
                <div key={result.actionId} className="rounded-md border border-border bg-surface/40 p-2.5">
                  <div className="text-xs">
                    {view.countries[result.countryId]?.flag} {view.countries[result.countryId]?.name}:{" "}
                    <span className="font-medium">{ACTION_META[result.actionType]?.name ?? result.actionType}</span>
                    {result.targetCountryId && (
                      <span className="text-muted"> → {view.countries[result.targetCountryId]?.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {newBriefings.length > 0 && (
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
              Nuovi rapporti riservati ({newBriefings.length})
            </h3>
            <p className="text-[11px] text-muted">
              Disponibili nel pannello «Rapporti segreti» — visibili solo a te.
            </p>
          </section>
        )}

        <div className="flex justify-end">
          <Button onClick={dismissResolution}>Al turno {view.turn}</Button>
        </div>
      </div>
    </Dialog>
  );
}
