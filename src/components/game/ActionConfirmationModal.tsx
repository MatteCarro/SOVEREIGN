"use client";

import * as React from "react";
import { Zap, Coins, AlertTriangle, Target, Percent } from "lucide-react";
import { GameView } from "@/lib/view";
import { ActionDef, validateAction } from "@/lib/engine/actions";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client/api";
import { refreshGame, useGameStore } from "@/lib/client/gameStore";
import { viewAsDoc } from "./ActionDrawer";

/** Pre-flight confirmation: costs, predicted risks and target selection. */
export function ActionConfirmationModal({
  def,
  view,
  onClose,
}: {
  def: ActionDef;
  view: GameView;
  onClose: () => void;
}) {
  const { selectedCountryId } = useGameStore();
  const my = view.myCountryId!;
  const [target, setTarget] = React.useState<string | null>(
    def.needsTarget && selectedCountryId && selectedCountryId !== my ? selectedCountryId : null,
  );
  const [regionId, setRegionId] = React.useState<string | null>(
    def.needsRegion ? view.countries[my].regions[0]?.id ?? null : null,
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const doc = viewAsDoc(view);
  const payload: Record<string, unknown> | null = def.needsRegion && regionId ? { regionId } : null;
  const validationError = validateAction(doc, my, def.id, target, def.needsText ? { body: "x" } : payload);

  const targetCandidates = Object.values(view.countries)
    .filter((c) => c.id !== my && (c.control === "player" || c.control === "ai"))
    .sort((a, b) => (a.control === "player" ? -1 : 1) - (b.control === "player" ? -1 : 1) || a.name.localeCompare(b.name));

  const chance = def.successChance
    ? Math.round(def.successChance(doc, view.countries[my], target ? view.countries[target] : null) * 100)
    : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/games/${view.id}/actions`, {
        type: def.id,
        targetCountryId: target,
        payload,
      });
      await refreshGame(view.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nell'invio dell'azione.");
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader title={def.name} subtitle={def.description} />
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent"><Zap size={10} /> {def.apCost} punti azione</Badge>
          {def.treasuryCost && <Badge><Coins size={10} /> {def.treasuryCost} fondi</Badge>}
          {def.cooldown && <Badge variant="info">ricarica {def.cooldown} turni</Badge>}
          {chance !== null && (
            <Badge variant={chance >= 65 ? "success" : "warning"}>
              <Percent size={10} /> successo ~{chance}%
            </Badge>
          )}
        </div>

        {def.needsTarget && (
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs text-muted">
              <Target size={11} /> Paese bersaglio
            </label>
            <Select value={target ?? ""} onChange={(event) => setTarget(event.target.value || null)}>
              <option value="">— scegli un paese —</option>
              {targetCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.control === "player" ? "(giocatore)" : "(AI)"}
                </option>
              ))}
            </Select>
          </div>
        )}

        {def.needsRegion && (
          <div>
            <label className="mb-1 block text-xs text-muted">Regione</label>
            <Select value={regionId ?? ""} onChange={(event) => setRegionId(event.target.value || null)}>
              {view.countries[my].regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name} (sviluppo {region.development}, malcontento {region.unrest})
                </option>
              ))}
            </Select>
          </div>
        )}

        {def.risk && (
          <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-2 text-[11px] text-warning">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {def.risk}
          </p>
        )}

        {(error || validationError) && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
            {error ?? validationError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button disabled={busy || Boolean(validationError)} onClick={submit}>
            {busy ? "Invio..." : "Ordina"}
          </Button>
        </div>
        <p className="text-[10px] text-faint">
          L&apos;azione sarà eseguita alla risoluzione del turno {view.turn}. Punti azione e fondi
          vengono impegnati subito e rimborsati se l&apos;azione diventa impossibile.
        </p>
      </div>
    </Dialog>
  );
}
