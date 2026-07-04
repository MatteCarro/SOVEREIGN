"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { startPolling, useGameStore } from "@/lib/client/gameStore";
import { DiplomacyChat } from "@/components/game/DiplomacyChat";
import { TreatyCard } from "@/components/game/TreatyCard";
import { Button } from "@/components/ui/button";

/** Full-page diplomacy view: chat plus every treaty involving you. */
export default function DiplomacyPage({ params }: { params: Promise<{ gameId: string }> }) {
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
  const myTreaties = view.treaties.filter(
    (t) => view.myCountryId && t.parties.includes(view.myCountryId),
  );
  return (
    <main className="mx-auto flex h-screen max-w-4xl flex-col px-4 py-4">
      <Link href={`/game/${gameId}`}>
        <Button variant="ghost" size="sm" className="mb-3 w-fit">
          <ArrowLeft size={13} /> Torna alla mappa
        </Button>
      </Link>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[1fr_280px]">
        <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-panel/60 p-3">
          <DiplomacyChat view={view} />
        </div>
        <div className="min-h-0 space-y-2 overflow-y-auto">
          <h2 className="text-[10px] uppercase tracking-wide text-faint">I tuoi trattati</h2>
          {myTreaties.length === 0 && <p className="text-xs text-muted">Nessun trattato.</p>}
          {myTreaties.map((treaty) => (
            <TreatyCard key={treaty.id} treaty={treaty} view={view} />
          ))}
        </div>
      </div>
    </main>
  );
}
