"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Globe2, Plus, KeyRound, Users, Clock, Bot, RefreshCw, HelpCircle,
  UserRound, Check, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client/api";
import { HowToPlayDialog } from "@/components/guide/HowToPlayDialog";
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
  const [nameError, setNameError] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(search.get("create") === "1");
  const [showGuide, setShowGuide] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState("");
  const nameRef = React.useRef<HTMLInputElement>(null);

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

  /** Ensures a valid name; on failure focuses + highlights the field. */
  const requireName = (): boolean => {
    if (playerName.trim().length < 2) {
      setNameError(true);
      setError(null);
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setNameError(false);
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
      setError(err instanceof ApiError ? err.message : "Errore durante la creazione della partita.");
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
    { value: "0", label: "Manuale (decide l'host)" },
    { value: "10", label: "10 minuti" },
    { value: "30", label: "30 minuti" },
    { value: "60", label: "1 ora" },
  ];

  const nameValid = playerName.trim().length >= 2;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Globe2 size={18} className="text-accent" />
          <span className="font-display text-xl font-bold tracking-[0.2em]">SOVEREIGN</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)}>
            <HelpCircle size={14} /> Come si gioca
          </Button>
          {resolver && (
            <Badge variant={resolver.mode === "anthropic" ? "accent" : "muted"}>
              <Bot size={11} />
              {resolver.mode === "anthropic" ? `AI ${resolver.model}` : "AI simulata"}
            </Badge>
          )}
        </div>
      </header>

      {/* Step 1 — name (prominent, required) */}
      <Card className="mb-5 border-accent/30">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 text-[10px] text-accent">1</span>
              <UserRound size={12} /> Il tuo nome da leader
              <span className="text-danger">*</span>
            </label>
            <div className="relative max-w-sm">
              <Input
                ref={nameRef}
                value={playerName}
                onChange={(event) => {
                  setPlayerName(event.target.value);
                  if (event.target.value.trim().length >= 2) setNameError(false);
                }}
                placeholder="es. Alessandra"
                maxLength={24}
                className={nameError ? "border-danger focus-visible:ring-danger" : nameValid ? "border-success/50" : ""}
              />
              {nameValid && (
                <Check size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-success" />
              )}
            </div>
            {nameError ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-danger">
                <AlertCircle size={11} /> Scrivi il tuo nome (almeno 2 caratteri) per continuare.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted">
                Obbligatorio. È il nome con cui gli altri giocatori ti vedranno.
              </p>
            )}
          </div>
          <p className="text-[11px] text-faint sm:max-w-[220px]">
            Prima volta?{" "}
            <button onClick={() => setShowGuide(true)} className="text-accent hover:underline">
              Leggi la guida in 8 passi →
            </button>
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Step 2 — create */}
        <section>
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[11px] text-accent">2</span>
                <Plus size={14} className="text-accent" /> Crea una nuova partita
              </CardTitle>
              <p className="text-[11px] text-muted">
                Sei tu l&apos;host: scegli le regole, poi invita gli altri con il codice.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showCreate ? (
                <Button className="w-full" size="lg" onClick={() => { if (requireName()) setShowCreate(true); }}>
                  <Plus size={16} /> Crea nuova partita
                </Button>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Nome della partita</label>
                    <Input
                      value={gameName}
                      onChange={(event) => setGameName(event.target.value)}
                      placeholder={playerName.trim() ? `Partita di ${playerName.trim()}` : "Crisi nel Mediterraneo"}
                      maxLength={48}
                    />
                    <p className="mt-1 text-[10px] text-faint">Facoltativo: se lo lasci vuoto ne generiamo uno.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs text-muted">
                        <Clock size={11} /> Durata turno
                      </label>
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
                      <label className="mb-1 flex items-center gap-1 text-xs text-muted">
                        <Users size={11} /> Giocatori max
                      </label>
                      <Select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))}>
                        {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Stile del mondo</label>
                    <Select value={mapStyle} onChange={(event) => setMapStyle(event.target.value as typeof mapStyle)}>
                      <option value="alternate">Mondo alternativo</option>
                      <option value="historical">Stile storico</option>
                    </Select>
                  </div>
                  <ToggleRow label="Partita pubblica" hint="Visibile nella lista pubblica" value={isPublic} onChange={setIsPublic} />
                  <ToggleRow label="Paesi neutrali gestiti dall'AI" hint="Rispondono a trattati e diplomazia" value={aiNeutrals} onChange={setAiNeutrals} />
                  <ToggleRow label="Diplomazia AI" hint="Analisi narrativa dei messaggi a fine turno" value={aiDiplomacy} onChange={setAiDiplomacy} />
                  <div className="flex gap-2">
                    <Button className="flex-1" size="lg" disabled={busy} onClick={createGame}>
                      {busy ? "Creazione..." : "Crea e gioca"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Annulla</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Step 2b — join by code */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound size={14} className="text-accent" /> Hai un codice invito?
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
              <Button variant="secondary" disabled={busy} onClick={joinByCode}>Entra</Button>
            </CardContent>
          </Card>
        </section>

        {/* Public games */}
        <section>
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
                <div className="py-8 text-center">
                  <p className="text-sm text-muted">Nessuna partita pubblica al momento.</p>
                  <p className="mt-1 text-xs text-faint">Creane una tu qui a sinistra — sarà la prima del mondo.</p>
                </div>
              )}
              {games.map((game) => (
                <div key={game.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{game.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="flex items-center gap-1"><Users size={10} /> {game.playerCount}/{game.maxPlayers}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {game.turnDurationMinutes === 0 ? "manuale" : `${game.turnDurationMinutes}m`}
                      </span>
                      <span>Turno {game.turn}</span>
                      {game.aiDiplomacy && <span className="flex items-center gap-1 text-accent"><Bot size={10} /> AI</span>}
                      <Badge variant={game.status === "lobby" ? "info" : "success"} className="px-1.5 py-0">
                        {game.status === "lobby" ? "In lobby" : "In corso"}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" disabled={busy || game.playerCount >= game.maxPlayers} onClick={() => joinPublic(game.id)}>
                    Entra
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <HowToPlayDialog open={showGuide} onClose={() => setShowGuide(false)} />
    </main>
  );
}

function ToggleRow({
  label, hint, value, onChange,
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
      <span className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-accent/70" : "bg-raised"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
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
