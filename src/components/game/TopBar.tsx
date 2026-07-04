"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Gavel, Globe2, Loader2 } from "lucide-react";
import { GameView } from "@/lib/view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TurnTimer } from "./TurnTimer";
import { ResourceBar } from "./ResourceBar";
import { api, ApiError } from "@/lib/client/api";
import { refreshGame, useGameStore } from "@/lib/client/gameStore";

export function TopBar({ view }: { view: GameView }) {
  const [busy, setBusy] = React.useState(false);
  const setError = useGameStore((s) => s.setError);
  const country = view.myCountryId ? view.countries[view.myCountryId] : null;
  const me = view.players.find((p) => p.id === view.myPlayerId);
  const isHost = view.myPlayerId === view.hostId;
  const readyCount = view.players.filter((p) => p.ready).length;

  const alerts = React.useMemo(() => {
    if (!country) return 0;
    let count = 0;
    if (country.stats.stability < 30) count++;
    if (country.stats.treasury < 60) count++;
    count += view.wars.filter(
      (w) => w.status === "active" && (w.attacker === country.id || w.defender === country.id),
    ).length;
    count += view.treaties.filter(
      (t) => t.status === "proposed" && t.parties[1] === country.id && t.proposedBy !== country.id,
    ).length;
    count += view.sanctions.filter((s) => s.active && s.target === country.id).length;
    return count;
  }, [country, view]);

  const toggleReady = async () => {
    if (!me) return;
    setBusy(true);
    try {
      await api.post(`/api/games/${view.id}/ready`, { ready: !me.ready });
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore.");
    } finally {
      setBusy(false);
    }
  };

  const resolveNow = async () => {
    setBusy(true);
    try {
      await api.post(`/api/games/${view.id}/resolve`);
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nella risoluzione.");
    } finally {
      setBusy(false);
    }
  };

  const resolving = view.resolvingTurn === view.turn;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-panel/80 px-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="hidden items-center gap-1.5 sm:flex" title="SOVEREIGN — home">
          <Globe2 size={15} className="text-accent" />
          <span className="font-display text-sm font-bold tracking-[0.18em]">SOVEREIGN</span>
        </Link>
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <span className="font-mono text-xs text-muted">Turno</span>
          <span className="font-display text-lg leading-none text-accent">{view.turn}</span>
          <TurnTimer turnEndsAt={view.turnEndsAt} />
        </div>
        {country && (
          <div className="hidden min-w-0 items-center gap-1.5 border-l border-border pl-3 md:flex">
            <span className="text-base leading-none">{country.flag}</span>
            <span className="truncate text-sm font-medium">{country.name}</span>
          </div>
        )}
        <div
          className="hidden items-center gap-1.5 border-l border-border pl-3 lg:flex"
          title="Tensione mondiale: quanto il sistema internazionale è vicino a una crisi globale."
        >
          <span className="text-[10px] uppercase tracking-wide text-faint">Tensione</span>
          <span
            className={`font-mono text-xs ${view.globalTension >= 60 ? "text-danger" : view.globalTension >= 35 ? "text-warning" : "text-success"}`}
          >
            {Math.round(view.globalTension)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {country && <div className="hidden sm:block"><ResourceBar country={country} /></div>}
        {alerts > 0 && (
          <Badge variant="warning" title="Situazioni che richiedono attenzione (crisi, guerre, proposte)">
            <AlertTriangle size={11} /> {alerts}
          </Badge>
        )}
        {resolving ? (
          <Badge variant="info"><Loader2 size={11} className="animate-spin" /> Risoluzione...</Badge>
        ) : (
          <>
            <Button
              size="sm"
              variant={me?.ready ? "success" : "default"}
              disabled={busy || !country}
              onClick={toggleReady}
              title={me?.ready ? "Ritira la conferma" : "Conferma le azioni per questo turno"}
            >
              <CheckCircle2 size={13} />
              {me?.ready ? `Confermato (${readyCount}/${view.players.length})` : "Conferma azioni"}
            </Button>
            {isHost && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={resolveNow} title="Risolvi il turno adesso (host)">
                <Gavel size={13} />
                <span className="hidden sm:inline">Risolvi turno</span>
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
