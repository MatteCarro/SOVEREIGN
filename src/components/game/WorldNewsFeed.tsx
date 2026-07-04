"use client";

import { Newspaper, Bot } from "lucide-react";
import { GameView } from "@/lib/view";

export function WorldNewsFeed({ view }: { view: GameView }) {
  const events = [...view.worldEvents].reverse();
  return (
    <div className="space-y-2">
      {events.length === 0 && (
        <p className="py-6 text-center text-xs text-muted">Il mondo è tranquillo. Per ora.</p>
      )}
      {events.map((event) => (
        <article key={event.id} className="rounded-md border border-border bg-surface/60 p-2.5 animate-fade-in">
          <div className="flex items-start gap-2">
            <Newspaper size={13} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <h4 className="text-xs font-semibold leading-snug">{event.headline}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{event.description}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-faint">
                <span>Turno {event.turn}</span>
                {event.affectedCountryIds.map((id) => (
                  <span key={id} className="rounded bg-raised px-1">
                    {view.countries[id]?.flag} {view.countries[id]?.name ?? id}
                  </span>
                ))}
                {event.source === "ai" && (
                  <span className="flex items-center gap-0.5 text-info">
                    <Bot size={9} /> analisi AI
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
