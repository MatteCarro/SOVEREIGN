"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Bot } from "lucide-react";
import { startPolling, useGameStore } from "@/lib/client/gameStore";
import { WorldNewsFeed } from "@/components/game/WorldNewsFeed";
import { EffectList } from "@/components/game/TurnLog";
import { ACTION_META } from "@/components/game/actionMeta";
import { Button } from "@/components/ui/button";

/** Turn-by-turn archive: resolutions and world events. */
export default function HistoryPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { view } = useGameStore();

  React.useEffect(() => startPolling(gameId), [gameId]);

  if (!view || view.id !== gameId) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </main>
    );
  }
  const reports = [...view.resolutions].reverse();
  return (
    <main className="mx-auto max-w-4xl px-4 py-4">
      <Link href={`/game/${gameId}`}>
        <Button variant="ghost" size="sm" className="mb-3">
          <ArrowLeft size={13} /> Torna alla mappa
        </Button>
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h1 className="mb-3 font-display text-lg">Cronologia dei turni</h1>
          <div className="space-y-4">
            {reports.length === 0 && <p className="text-sm text-muted">Nessun turno risolto finora.</p>}
            {reports.map((report) => (
              <article key={report.turn} className="rounded-lg border border-border bg-panel/60 p-3">
                <h2 className="mb-1 text-sm font-semibold text-accent">Turno {report.turn}</h2>
                {report.narrativeSummary && (
                  <p className="mb-2 text-xs italic leading-relaxed text-muted">
                    <Bot size={10} className="mr-1 inline text-info" />
                    {report.narrativeSummary}
                  </p>
                )}
                <div className="space-y-1.5">
                  {report.actionResults.map((result) => (
                    <div key={result.actionId} className="rounded border border-border/60 bg-surface/40 px-2 py-1.5">
                      <div className="text-[11px]">
                        {view.countries[result.countryId]?.flag}{" "}
                        <span className="font-medium">
                          {ACTION_META[result.actionType]?.name ?? result.actionType}
                        </span>
                        {result.targetCountryId && (
                          <span className="text-muted"> → {view.countries[result.targetCountryId]?.name}</span>
                        )}
                        {!result.success && <span className="text-danger"> (fallita)</span>}
                      </div>
                      {result.countryId === view.myCountryId && (
                        <EffectList effects={result.effects} view={view} />
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section>
          <h1 className="mb-3 font-display text-lg">Notizie mondiali</h1>
          <WorldNewsFeed view={view} />
        </section>
      </div>
    </main>
  );
}
