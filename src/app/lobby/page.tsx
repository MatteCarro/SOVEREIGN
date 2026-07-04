"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Globe2, Plus, KeyRound, Users, Clock, Bot, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client/api";
import type { GameSummary } from "@/lib/server/store";
import type { ResolverStatus } from "@/lib/view";

function usePlayerName() {
  const [name, setName] = React.useState("");
  React.useEffect(() => {
    setName(localStorage.getItem("sovereign_name") ?? "");
  }, []);
  const update = (value: string) => {
    setName(value);
    localStorage.setItem("sovereign_name", value);
  };
  return [name, update] as const;
}

function LobbyContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [playerName, setPlayerName] = usePlayerName();
  const [games, setGames] = React.useState<GameSummary[]>([]);
  const [resolver, setResolver] = React.useState<ResolverStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(search.get("create") === "1");
  const [inviteCode, setInviteCode] = React.useState("");

  // Create-game options
  const [gameName, setGameName] = React.useState("");
  const [turnDuration, setTurnDuration] = React.useState<"0" | "10" | "30" | "60">("0");
  const [maxPlayers, setMaxPlayers] = React.useState(4);
  const [isPublic, setIsPublic] = React.useState(true);
  const [aiNeutrals, setAiNeutrals] = React.useState(true);
  const [aiDiplomacy, setAiDiplomacy] = React.useState(true);
  const [mapStyle, setMapStyle] = React.useState<"alternate" | "historical">("alternate");

  const loadGames = React.useCallback(async () => {
    try {
      const data = await api.get<{ games: GameSummary[]; resolver: ResolverStatus }>("/api/games");
      setGames(data.games);
      setResolver(data.resolver);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete");
    }
  }, []);

  React.useEffect(() => {
    void api.get("/api/session");
    void loadGames();
    const timer = setInterval(loadGames, 6000);
    return () => clearInterval(timer);
  }, [loadGames]);

  const requireName = (): boolean => {
    if (playerName.trim().length < 2) {
      setError("Inserisci prima il tuo nome (almeno 2 caratteri).");
      return false;
    }
    return true;
  };

  const createGame = async () => {
    if (!requireName()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ gameId: string }>("/api/games", {
        name: gameName.trim() || `Partita di ${playerName.trim()}`,
        playerName: playerName.trim(),
        options: {
          turnDurationMinutes: Number(turnDuration),
          maxPlayers,
          isPublic,
          aiNeutrals,
          aiDiplomacy,
          mapStyle,
        },
      });
      router.push(`/game/${data.gameId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore durante la creazione.");
      setBusy(false);
    }
  };

  const joinByCode = async () => {
    if (!requireName()) return;
    if (inviteCode.trim().length !== 6) {
      setError("Il codice invito è di 6 caratteri.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ gameId: string }>("/api/games/join", {
        code: inviteCode.trim().toUpperCase(),
        playerName: playerName.trim(),
      });
      router.push(`/game/${data.gameId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nell'accesso alla partita.");
      setBusy(false);
    }
  };

  const joinPublic = async (gameId: string) => {
    if (!requireName()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/games/${gameId}/join`, { playerName: playerName.trim() });
      router.push(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nell'accesso alla partita.");
      setBusy(false);
    }
  };

  const DURATIONS: { value: "0" | "10" | "30" | "60"; label: string }[] = [
    { value: "0", label: "Risoluzione manuale (host)" },
    { value: "10", label: "10 minuti" },
    { value: "30", label: "30 minuti" },
    { value: "60", label: "1 ora" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Globe2 size={18} className="text-accent" />
          <span className="font-display text-xl font-bold tracking-[0.2em]">SOVEREIGN</span>
        </Link>
        {resolver && (
          <Badge variant={resolver.mode === "anthropic" ? "accent" : "muted"}>
            <Bot size={11} />
            {resolver.mode === "anthropic"
              ? `AI attiva (${resolver.model})`
              : "AI simulata (mock) — nessuna API key"}
          </Badge>
        )}
      </header>

      <div className="mb-6">
        <label className="mb-1 block text-xs text-muted">Il tuo nome da leader</label>
        <Input
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="es. Alessandra"
          maxLength={24}
          className="max-w-sm"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users size={14} className="text-accent" /> Partite pubbliche
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={loadGames}>
                <RefreshCw size={12} /> Aggiorna
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {games.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">
                  Nessuna partita pubblica al momento. Creane una tu.
                </p>
              )}
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{game.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <Users size={10} /> {game.playerCount}/{game.maxPlayers}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {game.turnDurationMinutes === 0 ? "manuale" : `${game.turnDurationMinutes} min`}
                      </span>
                      <span>Turno {game.turn}</span>
                      {game.aiDiplomacy && (
                        <span className="flex items-center gap-1 text-accent">
                          <Bot size={10} /> AI
                        </span>
                      )}
                      <Badge variant={game.status === "lobby" ? "info" : "success"} className="px-1.5 py-0">
                        {game.status === "lobby" ? "In lobby" : "In corso"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || game.playerCount >= game.maxPlayers}
                    onClick={() => joinPublic(game.id)}
                  >
                    Entra
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound size={14} className="text-accent" /> Entra con codice invito
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="max-w-36 font-mono tracking-[0.3em]"
              />
              <Button variant="secondary" disabled={busy} onClick={joinByCode}>
                Entra
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus size={14} className="text-accent" /> Crea una nuova partita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showCreate ? (
                <Button className="w-full" onClick={() => setShowCreate(true)}>
                  Configura partita
                </Button>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Nome della partita</label>
                    <Input
                      value={gameName}
                      onChange={(event) => setGameName(event.target.value)}
                      placeholder="Crisi nel Mediterraneo"
                      maxLength={48}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted">Durata del turno</label>
                      <Select
                        value={turnDuration}
                        onChange={(event) => setTurnDuration(event.target.value as typeof turnDuration)}
                      >
                        {DURATIONS.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted">Giocatori max</label>
                      <Select
                        value={maxPlayers}
                        onChange={(event) => setMaxPlayers(Number(event.target.value))}
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Stile del mondo</label>
                    <Select
                      value={mapStyle}
                      onChange={(event) => setMapStyle(event.target.value as typeof mapStyle)}
                    >
                      <option value="alternate">Mondo alternativo</option>
                      <option value="historical">Stile storico</option>
                    </Select>
                  </div>
                  <ToggleRow
                    label="Partita pubblica"
                    hint="Visibile nella lista delle partite"
                    value={isPublic}
                    onChange={setIsPublic}
                  />
                  <ToggleRow
                    label="Paesi neutrali gestiti dall'AI"
                    hint="I paesi non scelti rispondono a trattati e diplomazia"
                    value={aiNeutrals}
                    onChange={setAiNeutrals}
                  />
                  <ToggleRow
                    label="Diplomazia AI"
                    hint="Analisi narrativa dei messaggi a fine turno"
                    value={aiDiplomacy}
                    onChange={setAiDiplomacy}
                  />
                  <Button className="w-full" disabled={busy} onClick={createGame}>
                    {busy ? "Creazione..." : "Crea partita"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-md border border-border bg-surface/50 px-3 py-2 text-left"
    >
      <span>
        <span className="block text-sm">{label}</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-accent/70" : "bg-raised"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}

export default function LobbyPage() {
  return (
    <React.Suspense>
      <LobbyContent />
    </React.Suspense>
  );
}
