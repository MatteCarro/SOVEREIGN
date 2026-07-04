"use client";

import { CountryState } from "@/lib/types";
import { GameView } from "@/lib/view";
import { Meter } from "@/components/ui/meter";
import { Badge } from "@/components/ui/badge";
import { LeaderProfileCard } from "@/components/lobby/LeaderProfileCard";
import { formatNumber } from "@/lib/utils";

/** Full country overview (Governo tab / country page). */
export function CountryPanel({ country, view }: { country: CountryState; view: GameView }) {
  const s = country.stats;
  const flags = view.flags.filter((f) => f.countryId === country.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{country.flag}</span>
        <div>
          <h2 className="font-display text-lg leading-tight">{country.name}</h2>
          <p className="text-[11px] text-muted">
            {country.capital} · {formatNumber(country.population)} mln abitanti
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-border bg-surface/60 p-2" title="Fondi disponibili. Il reddito netto per turno sconta corruzione, sanzioni e interessi sul debito.">
          <div className="font-mono text-sm">{formatNumber(s.treasury)}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted">Tesoro</div>
          <div className={`text-[10px] ${s.income >= 0 ? "text-success" : "text-danger"}`}>
            {s.income >= 0 ? "+" : ""}{Math.round(s.income)}/turno
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface/60 p-2" title="Debito pubblico: gli interessi erodono il bilancio.">
          <div className="font-mono text-sm">{Math.round(s.debt)}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted">Debito</div>
        </div>
        <div className="rounded-md border border-border bg-surface/60 p-2" title="Punti azione del turno corrente.">
          <div className="font-mono text-sm text-accent">{s.actionPoints}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted">Punti azione</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Meter label="Stabilità" value={s.stability} hint="Quanto il paese è lontano dalla crisi interna." />
        <Meter label="Legittimità" value={s.legitimacy} hint="Riconoscimento del governo, dentro e fuori i confini." />
        <Meter label="Consenso" value={s.publicSupport} hint="Sostegno popolare al governo." />
        <Meter label="Influenza" value={s.influence} hint="Capacità diplomatica di convincere altri paesi." />
        <Meter label="Corruzione" value={s.corruption} invert hint="Aumenta i costi e riduce la legittimità nel tempo." />
        <Meter label="Ricerca" value={s.research} hint="Base tecnologica: sblocca capacità avanzate." />
        <Meter label="Prontezza militare" value={s.militaryReadiness} hint="Livello operativo delle forze armate." />
        <Meter label="Forza militare" value={s.militaryStrength} hint="Dimensione ed equipaggiamento delle forze armate." />
        <Meter label="Capacità commerciale" value={s.tradeCapacity} hint="Apertura e infrastruttura commerciale." />
        <Meter label="Pressione sanzioni" value={s.sanctionPressure} invert hint="Danno economico da sanzioni subite." />
        {s.nuclearPosture > 0 && (
          <Meter label="Postura nucleare" value={s.nuclearPosture} invert hint="Deterrenza strategica astratta: scoraggia gli attacchi ma erode la fiducia globale." />
        )}
      </div>

      {flags.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-faint">Condizioni attive</div>
          <div className="flex flex-wrap gap-1">
            {flags.map((flag, index) => (
              <Badge key={index} variant="info" title={flag.reason}>
                {FLAG_LABELS[flag.flag]} · {flag.remainingTurns}t
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-surface/50 p-3">
        <LeaderProfileCard country={country} />
      </div>
    </div>
  );
}

const FLAG_LABELS: Record<string, string> = {
  diplomatic_suspicion: "Sospetto diplomatico",
  public_pressure: "Pressione pubblica",
  escalation_risk: "Rischio escalation",
  trust_bonus: "Credibilità",
  negotiation_momentum: "Slancio negoziale",
};
