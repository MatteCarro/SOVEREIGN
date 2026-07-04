"use client";

import * as React from "react";
import { Search, Check, Crown, Copy, Play, Users } from "lucide-react";
import { GameView } from "@/lib/view";
import { WorldMap } from "@/components/map/WorldMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Meter } from "@/components/ui/meter";
import { LeaderProfileCard } from "./LeaderProfileCard";
import { api, ApiError } from "@/lib/client/api";
import { refreshGame } from "@/lib/client/gameStore";
import { formatNumber } from "@/lib/utils";

/**
 * Country selection screen (game lobby phase): clickable map, search,
 * playable-country list, leader profile and host controls.
 */
export function CountryPicker({ view }: { view: GameView }) {
  const [selected, setSelected] = React.useState<string | null>(view.myCountryId);
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const playable = Object.values(view.countries)
    .filter((c) => c.control === "available" || c.control === "player")
    .sort((a, b) => a.name.localeCompare(b.name));

  const searched = query.trim().length >= 2
    ? Object.values(view.countries)
        .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 12)
    : playable;

  const selectedCountry = selected ? view.countries[selected] : null;
  const isHost = view.myPlayerId === view.hostId;
  const me = view.players.find((p) => p.id === view.myPlayerId);
  const allChosen = view.players.every((p) => p.countryId);

  const choose = async (countryId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/games/${view.id}/select-country`, { countryId });
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nella selezione.");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/games/${view.id}/start`);
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nell'avvio.");
      setBusy(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(view.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-bold tracking-[0.2em]">SOVEREIGN</span>
          <Badge variant="info">Lobby — scegli il tuo paese</Badge>
          <span className="hidden text-xs text-muted sm:inline">{view.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs tracking-[0.25em] text-accent hover:border-accent/50"
            title="Copia codice invito"
          >
            {view.inviteCode}
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          {isHost && (
            <Button size="sm" disabled={!allChosen || busy} onClick={start} title={allChosen ? "" : "Tutti i giocatori devono scegliere un paese"}>
              <Play size={13} /> Avvia partita
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div className="border-b border-danger/30 bg-danger/10 px-4 py-1.5 text-xs text-danger">{error}</div>
      )}

      <div className="grid flex-1 lg:grid-cols-[280px_1fr_320px] lg:overflow-hidden">
        {/* Country list */}
        <aside className="order-2 flex flex-col border-r border-border lg:order-1 lg:overflow-hidden">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca un paese..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {searched.map((country) => {
              const owner = view.players.find((p) => p.countryId === country.id);
              const disabled = country.control !== "available" && country.playerId !== view.myPlayerId;
              return (
                <button
                  key={country.id}
                  disabled={disabled && country.control !== "player"}
                  onClick={() => setSelected(country.id)}
                  className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${
                    selected === country.id
                      ? "border-accent/60 bg-accent/10"
                      : "border-transparent hover:bg-raised/60"
                  } ${country.control === "locked" || country.control === "ai" ? "opacity-50" : ""}`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{country.name}</span>
                    <span className="block text-[10px] text-muted">{country.capital}</span>
                  </span>
                  {owner && (
                    <Badge variant={owner.id === view.myPlayerId ? "accent" : "muted"} className="shrink-0">
                      {owner.name}
                    </Badge>
                  )}
                  {country.control === "ai" && <Badge variant="muted" className="shrink-0">AI</Badge>}
                  {country.control === "locked" && <Badge variant="muted" className="shrink-0">Bloccato</Badge>}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
              <Users size={12} /> Giocatori ({view.players.length}/{view.options.maxPlayers})
            </div>
            <div className="space-y-1">
              {view.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    {player.isHost && <Crown size={11} className="text-accent" />}
                    {player.name}
                    {player.id === view.myPlayerId && <span className="text-faint">(tu)</span>}
                  </span>
                  <span className="text-muted">
                    {player.countryId
                      ? `${view.countries[player.countryId]?.flag ?? ""} ${view.countries[player.countryId]?.name ?? ""}`
                      : "in attesa..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Map */}
        <div className="order-1 h-[42vh] lg:order-2 lg:h-full">
          <WorldMap
            data={{
              countries: view.countries,
              relations: view.relations,
              treaties: view.treaties,
              wars: view.wars,
              sanctions: view.sanctions,
              myCountryId: view.myCountryId,
              globalTension: view.globalTension,
            }}
            mode="politico"
            selectedCountryId={selected}
            onSelect={setSelected}
          />
        </div>

        {/* Country detail */}
        <aside className="order-3 border-l border-border lg:overflow-y-auto">
          {selectedCountry ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedCountry.flag}</span>
                <div>
                  <h2 className="font-display text-xl">{selectedCountry.name}</h2>
                  <p className="text-xs text-muted">
                    Capitale: {selectedCountry.capital} · {formatNumber(selectedCountry.population)} mln ab.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <Meter label="Stabilità" value={selectedCountry.stats.stability} hint="Quanto il paese è lontano dalla crisi interna." />
                <Meter label="Economia" value={selectedCountry.stats.tradeCapacity} hint="Capacità commerciale e industriale." />
                <Meter label="Prontezza militare" value={selectedCountry.stats.militaryReadiness} hint="Livello operativo delle forze armate." />
                <Meter label="Influenza" value={selectedCountry.stats.influence} hint="Capacità diplomatica di convincere altri paesi." />
                {selectedCountry.stats.nuclearPosture > 0 && (
                  <Meter label="Postura nucleare" value={selectedCountry.stats.nuclearPosture} invert hint="Deterrenza strategica astratta: protegge ma spaventa." />
                )}
              </div>

              <div className="rounded-md border border-border bg-surface/50 p-3">
                <LeaderProfileCard country={selectedCountry} />
              </div>

              {selectedCountry.control === "available" || selectedCountry.playerId === view.myPlayerId ? (
                <Button
                  className="w-full"
                  disabled={busy || selectedCountry.playerId === view.myPlayerId}
                  onClick={() => choose(selectedCountry.id)}
                >
                  {selectedCountry.playerId === view.myPlayerId ? (
                    <><Check size={14} /> Paese selezionato</>
                  ) : (
                    <>Guida {selectedCountry.name}</>
                  )}
                </Button>
              ) : (
                <p className="text-center text-xs text-muted">
                  {selectedCountry.control === "player"
                    ? "Già controllato da un altro giocatore."
                    : "Non selezionabile in questo scenario."}
                </p>
              )}
              {me?.countryId && selectedCountry.playerId !== view.myPlayerId && (
                <p className="text-center text-[11px] text-faint">
                  Scegliendo un nuovo paese, {view.countries[me.countryId]?.name} tornerà disponibile.
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
              Seleziona un paese dalla mappa o dalla lista per vederne i dettagli.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
