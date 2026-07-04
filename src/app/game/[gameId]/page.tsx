"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { startPolling, useGameStore } from "@/lib/client/gameStore";
import { api } from "@/lib/client/api";
import { GameLobby } from "@/components/lobby/GameLobby";
import { GameScreen } from "@/components/game/GameScreen";
import { Button } from "@/components/ui/button";

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { view, error } = useGameStore();

  React.useEffect(() => {
    void api.get("/api/session");
    const stop = startPolling(gameId);
    return stop;
  }, [gameId]);

  if (!view || view.id !== gameId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        {error ? (
          <>
            <p className="text-sm text-danger">{error}</p>
            <Link href="/lobby"><Button variant="secondary">Torna alla lobby</Button></Link>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-accent" />
            <p className="text-xs text-muted">Caricamento della situazione mondiale...</p>
          </>
        )}
      </main>
    );
  }

  if (view.status === "lobby") return <GameLobby view={view} />;
  return <GameScreen view={view} />;
}
