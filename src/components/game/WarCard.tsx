"use client";

import { Swords } from "lucide-react";
import { War } from "@/lib/types";
import { GameView } from "@/lib/view";
import { Badge } from "@/components/ui/badge";

export function WarCard({ war, view }: { war: War; view: GameView }) {
  const attacker = view.countries[war.attacker];
  const defender = view.countries[war.defender];
  const scoreLabel =
    war.score > 15
      ? `${attacker?.name ?? war.attacker} in vantaggio`
      : war.score < -15
        ? `${defender?.name ?? war.defender} in vantaggio`
        : "Fronte in stallo";
  return (
    <div className="rounded-md border border-danger/30 bg-danger/5 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <Swords size={12} />
          {attacker?.flag} {attacker?.name} vs {defender?.flag} {defender?.name}
        </span>
        <Badge variant={war.status === "active" ? "danger" : war.status === "ceasefire" ? "warning" : "muted"}>
          {war.status === "active" ? "In corso" : war.status === "ceasefire" ? "Cessate il fuoco" : "Conclusa"}
        </Badge>
      </div>
      <div className="mt-1.5 space-y-1 text-[11px] text-muted">
        <div>Iniziata al turno {war.startedTurn} · {scoreLabel}</div>
        <div className="flex gap-3">
          <span title="Esaurimento bellico: a 80 il fronte si congela da solo.">
            Esaurimento {attacker?.name}: <span className="font-mono">{Math.round(war.exhaustion[war.attacker] ?? 0)}</span>
          </span>
          <span>
            {defender?.name}: <span className="font-mono">{Math.round(war.exhaustion[war.defender] ?? 0)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
