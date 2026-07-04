"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { startPolling, useGameStore } from "@/lib/client/gameStore";
import { CountryPanel } from "@/components/game/CountryPanel";
import { Button } from "@/components/ui/button";

/** Full-page country dossier. */
export default function CountryPage({
  params,
}: {
  params: Promise<{ gameId: string; countryId: string }>;
}) {
  const { gameId, countryId } = use(params);
  const { view } = useGameStore();

  React.useEffect(() => startPolling(gameId), [gameId]);

  if (!view || view.id !== gameId) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </main>
    );
  }
  const country = view.countries[countryId.toUpperCase()];
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href={`/game/${gameId}`}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft size={13} /> Torna alla mappa
        </Button>
      </Link>
      {country ? (
        <CountryPanel country={country} view={view} />
      ) : (
        <p className="text-sm text-muted">Paese non trovato.</p>
      )}
    </main>
  );
}
