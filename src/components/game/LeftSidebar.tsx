"use client";

import * as React from "react";
import Link from "next/link";
import { pairKey } from "@/lib/types";
import { GameView } from "@/lib/view";
import { LeftTab, useGameStore } from "@/lib/client/gameStore";
import { TabBar } from "@/components/ui/tabs";
import { Meter } from "@/components/ui/meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryPanel } from "./CountryPanel";
import { TreatyCard } from "./TreatyCard";
import { WarCard } from "./WarCard";
import { MessageSquare, ArrowLeftRight } from "lucide-react";

const TABS: { id: LeftTab; label: string }[] = [
  { id: "governo", label: "Governo" },
  { id: "diplomazia", label: "Diplomazia" },
  { id: "economia", label: "Economia" },
  { id: "intelligence", label: "Intelligence" },
  { id: "difesa", label: "Difesa" },
  { id: "regioni", label: "Regioni" },
  { id: "cronologia", label: "Cronologia" },
];

export function LeftSidebar({ view }: { view: GameView }) {
  const { leftTab, setLeftTab, selectCountry, setChatCountryId, setRightTab, setCompareCountryId, setMobilePanel } =
    useGameStore();
  const country = view.myCountryId ? view.countries[view.myCountryId] : null;
  if (!country) return null;

  const incomingProposals = view.treaties.filter(
    (t) => t.status === "proposed" && t.proposedBy !== view.myCountryId && t.parties.includes(country.id),
  ).length;

  return (
    <div className="flex h-full flex-col">
      <TabBar
        tabs={TABS.map((t) => ({
          ...t,
          badge: t.id === "diplomazia" ? incomingProposals : undefined,
        }))}
        value={leftTab}
        onChange={(tab) => setLeftTab(tab)}
        compact
      />
      <div className="flex-1 overflow-y-auto p-3">
        {leftTab === "governo" && <CountryPanel country={country} view={view} />}
        {leftTab === "diplomazia" && (
          <DiplomacyTab view={view} onChat={(id) => { setChatCountryId(id); setRightTab("messaggi"); setMobilePanel("right"); }} onCompare={setCompareCountryId} onFocus={selectCountry} />
        )}
        {leftTab === "economia" && <EconomyTab view={view} />}
        {leftTab === "intelligence" && <IntelligenceTab view={view} />}
        {leftTab === "difesa" && <DefenseTab view={view} />}
        {leftTab === "regioni" && <RegionsTab view={view} />}
        {leftTab === "cronologia" && <HistoryTab view={view} />}
      </div>
    </div>
  );
}

function relationTone(value: number) {
  return value >= 15 ? "text-success" : value <= -15 ? "text-danger" : "text-foreground";
}

function DiplomacyTab({
  view,
  onChat,
  onCompare,
  onFocus,
}: {
  view: GameView;
  onChat: (countryId: string) => void;
  onCompare: (countryId: string) => void;
  onFocus: (countryId: string) => void;
}) {
  const my = view.myCountryId!;
  const relations = Object.entries(view.relations)
    .filter(([key]) => key.includes(my))
    .map(([key, rel]) => {
      const other = key.split("|").find((c) => c !== my)!;
      return { other, rel };
    })
    .filter((r) => view.countries[r.other])
    .sort((a, b) => b.rel.tension - a.rel.tension || a.rel.relation - b.rel.relation);

  const myTreaties = view.treaties
    .filter((t) => t.parties.includes(my) && (t.status === "active" || t.status === "proposed"))
    .sort((a, b) => (a.status === "proposed" ? -1 : 1) - (b.status === "proposed" ? -1 : 1));

  return (
    <div className="space-y-4">
      {myTreaties.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-[10px] uppercase tracking-wide text-faint">Trattati e proposte</h3>
          {myTreaties.map((treaty) => (
            <TreatyCard key={treaty.id} treaty={treaty} view={view} />
          ))}
        </section>
      )}
      <section className="space-y-1.5">
        <h3 className="text-[10px] uppercase tracking-wide text-faint">
          Relazioni ({relations.length})
        </h3>
        <p className="text-[10px] text-faint">
          Tensione: quanto una relazione è vicina a una crisi. Fiducia: quanto pesano le tue promesse.
        </p>
        {relations.length === 0 && (
          <p className="text-xs text-muted">Nessuna relazione attiva: apri un canale diplomatico dalla mappa.</p>
        )}
        {relations.map(({ other, rel }) => {
          const c = view.countries[other];
          return (
            <div key={other} className="rounded-md border border-border bg-surface/60 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <button className="flex min-w-0 items-center gap-1.5 text-xs font-medium hover:text-accent" onClick={() => onFocus(other)}>
                  <span>{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Messaggio diplomatico" onClick={() => onChat(other)}>
                    <MessageSquare size={12} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Confronta paesi" onClick={() => onCompare(other)}>
                    <ArrowLeftRight size={12} />
                  </Button>
                </div>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
                <span title="Relazione da -100 (ostile) a +100 (alleato)">
                  Rel. <span className={`font-mono ${relationTone(rel.relation)}`}>{rel.relation > 0 ? "+" : ""}{Math.round(rel.relation)}</span>
                </span>
                <span title="Tensione: sopra 50 il rischio di crisi è concreto">
                  Tens. <span className={`font-mono ${rel.tension >= 50 ? "text-danger" : rel.tension >= 25 ? "text-warning" : "text-muted"}`}>{Math.round(rel.tension)}</span>
                </span>
                <span title="Fiducia reciproca: influenza l'esito dei negoziati">
                  Fid. <span className="font-mono text-muted">{Math.round(rel.trust)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function EconomyTab({ view }: { view: GameView }) {
  const country = view.countries[view.myCountryId!];
  const s = country.stats;
  const outgoing = view.sanctions.filter((x) => x.active && x.source === country.id);
  const incoming = view.sanctions.filter((x) => x.active && x.target === country.id);
  const tradeDeals = view.treaties.filter(
    (t) => t.status === "active" && t.type === "trade" && t.parties.includes(country.id),
  );
  const net = s.income - s.corruption * 0.1 - s.sanctionPressure * 0.15 - s.debt * 0.05;
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface/60 p-3">
        <h3 className="mb-2 text-[10px] uppercase tracking-wide text-faint">Bilancio previsto</h3>
        <div className="space-y-1 font-mono text-[11px]">
          <Row label="Reddito" value={`+${Math.round(s.income)}`} tone="text-success" />
          <Row label="Corruzione" value={`−${Math.round(s.corruption * 0.1)}`} tone="text-danger" />
          <Row label="Sanzioni" value={`−${Math.round(s.sanctionPressure * 0.15)}`} tone="text-danger" />
          <Row label="Interessi sul debito" value={`−${Math.round(s.debt * 0.05)}`} tone="text-danger" />
          <div className="border-t border-border pt-1">
            <Row label="Netto per turno" value={`${net >= 0 ? "+" : ""}${Math.round(net)}`} tone={net >= 0 ? "text-success" : "text-danger"} />
          </div>
        </div>
      </div>
      <div className="space-y-2.5">
        <Meter label="Capacità commerciale" value={s.tradeCapacity} hint="Apertura e infrastruttura commerciale del paese." />
        <Meter label="Pressione sanzioni" value={s.sanctionPressure} invert hint="Danno economico dalle sanzioni subite." />
        <Meter label="Debito" value={s.debt} invert hint="Debito pubblico: gli interessi pesano ogni turno." />
      </div>
      <section className="space-y-1.5">
        <h3 className="text-[10px] uppercase tracking-wide text-faint">Accordi commerciali ({tradeDeals.length})</h3>
        {tradeDeals.length === 0 && <p className="text-xs text-muted">Nessun accordo attivo.</p>}
        {tradeDeals.map((treaty) => <TreatyCard key={treaty.id} treaty={treaty} view={view} />)}
      </section>
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className="space-y-1.5">
          <h3 className="text-[10px] uppercase tracking-wide text-faint">Sanzioni</h3>
          {incoming.map((x) => (
            <div key={x.id} className="rounded-md border border-danger/30 bg-danger/5 px-2.5 py-2 text-xs">
              <Badge variant="danger" className="mr-2">Subite</Badge>
              da {view.countries[x.source]?.flag} {view.countries[x.source]?.name} (turno {x.imposedTurn})
            </div>
          ))}
          {outgoing.map((x) => (
            <div key={x.id} className="rounded-md border border-border bg-surface/60 px-2.5 py-2 text-xs">
              <Badge variant="warning" className="mr-2">Imposte</Badge>
              a {view.countries[x.target]?.flag} {view.countries[x.target]?.name} (turno {x.imposedTurn})
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}

function IntelligenceTab({ view }: { view: GameView }) {
  const ops = [...view.intelOps].sort((a, b) => b.turn - a.turn).slice(0, 20);
  const OP_LABELS: Record<string, string> = {
    gather_intel: "Raccolta informazioni",
    counter_intelligence: "Controspionaggio",
    influence_campaign: "Campagna di influenza",
    leak_information: "Fuga di notizie",
    spy_negotiations: "Intercettazione negoziati",
    sabotage_trust: "Sabotaggio diplomatico",
  };
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted">
        Le operazioni riservate del tuo paese e quelle ostili smascherate dai tuoi servizi.
      </p>
      <section className="space-y-1.5">
        <h3 className="text-[10px] uppercase tracking-wide text-faint">Operazioni ({ops.length})</h3>
        {ops.length === 0 && <p className="text-xs text-muted">Nessuna operazione registrata. Le azioni di intelligence si lanciano dal pannello azioni.</p>}
        {ops.map((op) => {
          const mine = op.source === view.myCountryId;
          return (
            <div key={op.id} className={`rounded-md border p-2.5 text-xs ${mine ? "border-border bg-surface/60" : "border-danger/30 bg-danger/5"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{OP_LABELS[op.type] ?? op.type}</span>
                <Badge variant={op.success ? "success" : "muted"}>{op.success ? "Riuscita" : "Fallita"}</Badge>
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                {mine
                  ? `contro ${view.countries[op.target]?.name ?? op.target}`
                  : `di ${view.countries[op.source]?.name ?? op.source} contro di te`}
                {" · "}turno {op.turn}
                {op.discovered && <span className="text-danger"> · scoperta</span>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function DefenseTab({ view }: { view: GameView }) {
  const country = view.countries[view.myCountryId!];
  const s = country.stats;
  const myWars = view.wars.filter(
    (w) => w.status !== "ended" && (w.attacker === country.id || w.defender === country.id),
  );
  const otherWars = view.wars.filter(
    (w) => w.status !== "ended" && !(w.attacker === country.id || w.defender === country.id),
  );
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <Meter label="Prontezza militare" value={s.militaryReadiness} hint="Sotto 50 non puoi dichiarare guerra. Decade lentamente in pace." />
        <Meter label="Forza militare" value={s.militaryStrength} hint="Dimensione ed equipaggiamento delle forze armate." />
        <Meter label="Postura nucleare" value={s.nuclearPosture} invert hint="Deterrenza astratta di fine partita: protegge, ma isola diplomaticamente." />
      </div>
      {s.nuclearPosture > 0 && (
        <p className="rounded-md border border-warning/30 bg-warning/5 px-2.5 py-2 text-[11px] text-warning">
          La tua postura nucleare è un deterrente astratto: aumenta la sicurezza percepita ma erode fiducia
          e alza il rischio di escalation globale.
        </p>
      )}
      <section className="space-y-1.5">
        <h3 className="text-[10px] uppercase tracking-wide text-faint">Le tue guerre ({myWars.length})</h3>
        {myWars.length === 0 && <p className="text-xs text-muted">Il paese è in pace.</p>}
        {myWars.map((war) => <WarCard key={war.id} war={war} view={view} />)}
      </section>
      {otherWars.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-[10px] uppercase tracking-wide text-faint">Conflitti nel mondo</h3>
          {otherWars.map((war) => <WarCard key={war.id} war={war} view={view} />)}
        </section>
      )}
    </div>
  );
}

function RegionsTab({ view }: { view: GameView }) {
  const country = view.countries[view.myCountryId!];
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        Le regioni del paese: lo sviluppo alimenta l&apos;economia, il malcontento erode la stabilità.
        Usa &quot;Investimento regionale&quot; per intervenire.
      </p>
      {country.regions.length === 0 && (
        <p className="text-xs text-muted">Nessun dato regionale per questo paese.</p>
      )}
      {country.regions.map((region) => (
        <div key={region.id} className="rounded-md border border-border bg-surface/60 p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium">{region.name}</span>
            <span className="text-muted">{region.population} mln</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Meter label="Sviluppo" value={region.development} />
            <Meter label="Malcontento" value={region.unrest} invert />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ view }: { view: GameView }) {
  const my = view.myCountryId;
  const events = view.worldEvents
    .filter((e) => e.affectedCountryIds.includes(my ?? "") || e.affectedCountryIds.length === 0)
    .slice(-30)
    .reverse();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted">Gli eventi che hanno coinvolto il tuo paese.</p>
        <Link href={`/game/${view.id}/history`} className="text-[11px] text-accent hover:underline">
          Archivio completo →
        </Link>
      </div>
      {events.map((event) => (
        <div key={event.id} className="rounded-md border border-border bg-surface/60 p-2.5">
          <div className="text-xs font-medium">{event.headline}</div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{event.description}</div>
          <div className="mt-1 text-[10px] text-faint">
            Turno {event.turn} {event.source === "ai" && "· analisi AI"}
          </div>
        </div>
      ))}
    </div>
  );
}

export { relationTone, pairKey };
