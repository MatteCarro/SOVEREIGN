"use client";

import * as React from "react";
import { FileSignature, Check, X } from "lucide-react";
import { Treaty } from "@/lib/types";
import { GameView } from "@/lib/view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client/api";
import { refreshGame, useGameStore } from "@/lib/client/gameStore";

const TYPE_LABELS: Record<Treaty["type"], string> = {
  alliance: "Alleanza",
  trade: "Accordo commerciale",
  non_aggression: "Non aggressione",
  peace: "Trattato di pace",
  military_access: "Accesso militare",
};

const STATUS: Record<Treaty["status"], { label: string; variant: "info" | "success" | "danger" | "muted" }> = {
  proposed: { label: "Proposta", variant: "info" },
  active: { label: "Attivo", variant: "success" },
  rejected: { label: "Respinto", variant: "muted" },
  broken: { label: "Rotto", variant: "danger" },
};

export function TreatyCard({ treaty, view }: { treaty: Treaty; view: GameView }) {
  const [busy, setBusy] = React.useState(false);
  const setError = useGameStore((s) => s.setError);
  const other = treaty.parties.find((p) => p !== view.myCountryId);
  const otherCountry = other ? view.countries[other] : null;
  const incoming =
    treaty.status === "proposed" &&
    treaty.proposedBy !== view.myCountryId &&
    treaty.parties.includes(view.myCountryId ?? "");

  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      await api.post(`/api/games/${view.id}/treaties`, { treatyId: treaty.id, accept });
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-surface/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <FileSignature size={12} className="text-accent" />
          {TYPE_LABELS[treaty.type]}
        </span>
        <Badge variant={STATUS[treaty.status].variant}>{STATUS[treaty.status].label}</Badge>
      </div>
      <div className="mt-1 text-[11px] text-muted">
        con {otherCountry ? `${otherCountry.flag} ${otherCountry.name}` : other}
        {treaty.status === "proposed" && (
          <span className="text-faint"> · proposta di {view.countries[treaty.proposedBy]?.name ?? treaty.proposedBy} (turno {treaty.proposedTurn})</span>
        )}
        {treaty.signedTurn !== null && <span className="text-faint"> · dal turno {treaty.signedTurn}</span>}
      </div>
      {incoming && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="success" disabled={busy} onClick={() => respond(true)}>
            <Check size={12} /> Accetta
          </Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => respond(false)}>
            <X size={12} /> Rifiuta
          </Button>
        </div>
      )}
    </div>
  );
}
