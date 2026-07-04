"use client";

import * as React from "react";
import { GameView } from "@/lib/view";
import { CountryPicker } from "./CountryPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/client/api";
import { refreshGame } from "@/lib/client/gameStore";

/**
 * Lobby phase wrapper: join prompt for spectators, country selection for
 * players.
 */
export function GameLobby({ view }: { view: GameView }) {
  const isPlayer = view.players.some((p) => p.id === view.myPlayerId);
  return isPlayer ? <CountryPicker view={view} /> : <JoinPrompt view={view} />;
}

function JoinPrompt({ view }: { view: GameView }) {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setName(localStorage.getItem("sovereign_name") ?? "");
  }, []);

  const join = async () => {
    if (name.trim().length < 2) {
      setError("Inserisci un nome di almeno 2 caratteri.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem("sovereign_name", name.trim());
      await api.post(`/api/games/${view.id}/join`, { playerName: name.trim() });
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nell'accesso.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-lg">{view.name}</CardTitle>
          <p className="text-xs text-muted">
            {view.players.length}/{view.options.maxPlayers} giocatori · in lobby
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Il tuo nome da leader</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button className="w-full" disabled={busy} onClick={join}>
            {busy ? "Ingresso..." : "Unisciti alla partita"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
