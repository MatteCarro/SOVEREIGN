"use client";

import * as React from "react";
import Link from "next/link";
import { Gavel, RefreshCw, Bot, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client/api";
import type { GameSummary } from "@/lib/server/store";
import type { ResolverStatus } from "@/lib/view";

/**
 * Dev console: resolver status, public games, manual turn resolution.
 * Resolution still enforces host permission server-side.
 */
export default function AdminDevPage() {
  const [games, setGames] = React.useState<GameSummary[]>([]);
  const [resolver, setResolver] = React.useState<ResolverStatus | null>(null);
  const [log, setLog] = React.useState<string[]>([]);

  const append = (line: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString("it-IT")} — ${line}`, ...prev].slice(0, 30));

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<{ games: GameSummary[]; resolver: ResolverStatus }>("/api/games");
      setGames(data.games);
      setResolver(data.resolver);
    } catch (err) {
      append(err instanceof Error ? err.message : "errore");
    }
  }, []);

  React.useEffect(() => {
    void api.get("/api/session");
    void load();
  }, [load]);

  const resolve = async (gameId: string) => {
    try {
      const data = await api.post<{ resolvedTurn: number }>(`/api/games/${gameId}/resolve`);
      append(`Partita ${gameId}: turno ${data.resolvedTurn} risolto.`);
      await load();
    } catch (err) {
      append(err instanceof ApiError ? `${gameId}: ${err.message}` : "errore");
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl">Console di sviluppo</h1>
        <Link href="/lobby" className="text-xs text-accent hover:underline">← lobby</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot size={14} /> Resolver AI</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          {resolver ? (
            <div className="flex items-center gap-2">
              <Badge variant={resolver.mode === "anthropic" ? "accent" : "muted"}>{resolver.mode}</Badge>
              <span className="text-muted">
                {resolver.mode === "anthropic"
                  ? `Modello: ${resolver.model} (ANTHROPIC_API_KEY configurata)`
                  : "Nessuna ANTHROPIC_API_KEY: analisi euristica locale (mock). Il gioco resta completo."}
              </span>
            </div>
          ) : (
            <span className="text-muted">caricamento...</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Database size={14} /> Partite pubbliche</CardTitle>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={12} /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {games.length === 0 && <p className="text-xs text-muted">Nessuna partita.</p>}
          {games.map((game) => (
            <div key={game.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface/60 px-3 py-2 text-xs">
              <div>
                <div className="font-medium">{game.name}</div>
                <div className="text-muted">
                  {game.id} · turno {game.turn} · {game.playerCount} giocatori · {game.status}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Link href={`/game/${game.id}`}>
                  <Button size="sm" variant="ghost">Apri</Button>
                </Link>
                <Button size="sm" variant="secondary" onClick={() => resolve(game.id)} title="Solo l'host può risolvere">
                  <Gavel size={12} /> Risolvi turno
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Log</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-muted">
            {log.join("\n") || "—"}
          </pre>
        </CardContent>
      </Card>
    </main>
  );
}
