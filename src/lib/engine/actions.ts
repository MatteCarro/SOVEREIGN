import {
  ActionCategory,
  CountryState,
  GameAction,
  GameDoc,
  Treaty,
  TreatyType,
  War,
  pairKey,
} from "@/lib/types";
import { Fx, getRelation } from "./effects";
import { Rng } from "./rng";

/**
 * Action catalog: every player action with AP cost, prerequisites,
 * cooldowns, success chances and deterministic effects. The AI never
 * defines or executes actions — only this catalog does.
 */

export interface ActionContext {
  doc: GameDoc;
  action: GameAction;
  country: CountryState;
  target: CountryState | null;
  fx: Fx;
  rng: Rng;
  lines: string[];
  /** Set to false to mark the action as failed (chance-based ops). */
  success: boolean;
}

export interface ActionDef {
  id: string;
  category: ActionCategory;
  name: string;
  description: string;
  apCost: number;
  treasuryCost?: number;
  /** Turns before the same country can repeat the action. */
  cooldown?: number;
  needsTarget?: boolean;
  /** Free-text payload (diplomatic message body). */
  needsText?: boolean;
  needsRegion?: boolean;
  /** Shown in the UI before confirming. */
  risk?: string;
  /** Returns an Italian reason if the action is not allowed, else null. */
  prereq?: (doc: GameDoc, country: CountryState, target: CountryState | null) => string | null;
  /** 0..1 — evaluated with the deterministic turn RNG. */
  successChance?: (doc: GameDoc, country: CountryState, target: CountryState | null) => number;
  apply: (ctx: ActionContext) => void;
}

function hasActiveTreaty(doc: GameDoc, a: string, b: string, type: TreatyType): boolean {
  const key = pairKey(a, b);
  return doc.treaties.some(
    (t) => t.status === "active" && t.type === type && pairKey(t.parties[0], t.parties[1]) === key,
  );
}

function hasPendingTreaty(doc: GameDoc, a: string, b: string, type: TreatyType): boolean {
  const key = pairKey(a, b);
  return doc.treaties.some(
    (t) => t.status === "proposed" && t.type === type && pairKey(t.parties[0], t.parties[1]) === key,
  );
}

function activeWar(doc: GameDoc, a: string, b: string): War | undefined {
  const key = pairKey(a, b);
  return doc.wars.find(
    (w) => w.status === "active" && pairKey(w.attacker, w.defender) === key,
  );
}

export function isAtWar(doc: GameDoc, countryId: string): boolean {
  return doc.wars.some(
    (w) => w.status === "active" && (w.attacker === countryId || w.defender === countryId),
  );
}

function proposeTreaty(ctx: ActionContext, type: TreatyType, label: string) {
  const { doc, country, target } = ctx;
  if (!target) return;
  const treaty: Treaty = {
    id: `treaty_${doc.seed}_${doc.treaties.length}_${doc.turn}`,
    type,
    parties: [country.id, target.id],
    proposedBy: country.id,
    status: "proposed",
    proposedTurn: doc.turn,
    signedTurn: null,
  };
  doc.treaties.push(treaty);
  ctx.lines.push(`Proposta di ${label} inviata a ${target.name}.`);
  ctx.fx.rel(country.id, target.id, "trust", 2, `Apertura diplomatica (${label})`);
}

const TREATY_LABELS: Record<TreatyType, string> = {
  alliance: "alleanza",
  trade: "accordo commerciale",
  non_aggression: "patto di non aggressione",
  peace: "trattato di pace",
  military_access: "accesso militare",
};

function treatyPrereq(type: TreatyType) {
  return (doc: GameDoc, country: CountryState, target: CountryState | null): string | null => {
    if (!target) return "Serve un paese bersaglio.";
    if (hasActiveTreaty(doc, country.id, target.id, type))
      return `Esiste già un ${TREATY_LABELS[type]} attivo con questo paese.`;
    if (hasPendingTreaty(doc, country.id, target.id, type))
      return `C'è già una proposta di ${TREATY_LABELS[type]} in sospeso.`;
    if (type !== "peace" && activeWar(doc, country.id, target.id))
      return "Siete in guerra: serve prima un trattato di pace o un cessate il fuoco.";
    if (type === "peace" && !activeWar(doc, country.id, target.id))
      return "Non c'è alcuna guerra attiva con questo paese.";
    return null;
  };
}

export const ACTIONS: Record<string, ActionDef> = {
  // ── Diplomazia ────────────────────────────────────────────────
  send_message: {
    id: "send_message",
    category: "diplomacy",
    name: "Messaggio diplomatico",
    description: "Invia un messaggio riservato a un altro governo. Il tono influenzerà l'analisi diplomatica del turno.",
    apCost: 1,
    needsTarget: true,
    needsText: true,
    apply: (ctx) => {
      ctx.lines.push(`Messaggio consegnato a ${ctx.target?.name}.`);
    },
  },
  propose_alliance: {
    id: "propose_alliance",
    category: "diplomacy",
    name: "Proponi alleanza",
    description: "Propone un'alleanza difensiva formale. Richiede relazioni buone per essere accettata.",
    apCost: 2,
    needsTarget: true,
    prereq: treatyPrereq("alliance"),
    apply: (ctx) => proposeTreaty(ctx, "alliance", TREATY_LABELS.alliance),
  },
  propose_trade: {
    id: "propose_trade",
    category: "diplomacy",
    name: "Proponi accordo commerciale",
    description: "Un accordo commerciale aumenta il reddito e migliora le relazioni nel tempo.",
    apCost: 2,
    needsTarget: true,
    prereq: treatyPrereq("trade"),
    apply: (ctx) => proposeTreaty(ctx, "trade", TREATY_LABELS.trade),
  },
  propose_nap: {
    id: "propose_nap",
    category: "diplomacy",
    name: "Patto di non aggressione",
    description: "Impegno reciproco a non dichiararsi guerra. Riduce la tensione se accettato.",
    apCost: 1,
    needsTarget: true,
    prereq: treatyPrereq("non_aggression"),
    apply: (ctx) => proposeTreaty(ctx, "non_aggression", TREATY_LABELS.non_aggression),
  },
  propose_peace: {
    id: "propose_peace",
    category: "diplomacy",
    name: "Proponi trattato di pace",
    description: "Pone fine a una guerra attiva se accettato. Riduce l'esaurimento bellico e la tensione.",
    apCost: 2,
    needsTarget: true,
    prereq: treatyPrereq("peace"),
    apply: (ctx) => proposeTreaty(ctx, "peace", TREATY_LABELS.peace),
  },
  request_military_access: {
    id: "request_military_access",
    category: "diplomacy",
    name: "Richiedi accesso militare",
    description: "Chiede il permesso di transito per le proprie forze armate.",
    apCost: 1,
    needsTarget: true,
    prereq: treatyPrereq("military_access"),
    apply: (ctx) => proposeTreaty(ctx, "military_access", TREATY_LABELS.military_access),
  },
  offer_aid: {
    id: "offer_aid",
    category: "diplomacy",
    name: "Offri aiuti",
    description: "Trasferisce fondi a un altro paese: migliora relazioni e fiducia.",
    apCost: 1,
    treasuryCost: 60,
    needsTarget: true,
    apply: (ctx) => {
      const t = ctx.target!;
      ctx.fx.stat(t.id, "treasury", 60, `Aiuti da ${ctx.country.name}`);
      ctx.fx.stat(t.id, "stability", 2, `Aiuti esteri da ${ctx.country.name}`);
      ctx.fx.rel(ctx.country.id, t.id, "relation", 6, "Pacchetto di aiuti");
      ctx.fx.rel(ctx.country.id, t.id, "trust", 4, "Pacchetto di aiuti");
      ctx.lines.push(`Aiuti per 60 fondi consegnati a ${t.name}.`);
    },
  },
  demand_concession: {
    id: "demand_concession",
    category: "diplomacy",
    name: "Esigi concessione",
    description: "Chiede una concessione sotto pressione. Funziona solo da posizioni di forza; altrimenti danneggia le relazioni.",
    apCost: 2,
    needsTarget: true,
    risk: "Se il bersaglio è più forte o le relazioni sono buone, la richiesta si ritorce contro.",
    apply: (ctx) => {
      const t = ctx.target!;
      const c = ctx.country;
      const edge =
        c.stats.militaryStrength * (c.stats.militaryReadiness / 100) -
        t.stats.militaryStrength * (t.stats.militaryReadiness / 100);
      if (edge > 10) {
        ctx.fx.stat(t.id, "treasury", -40, `Concessione estorta da ${c.name}`);
        ctx.fx.stat(c.id, "treasury", 40, `Concessione ottenuta da ${t.name}`);
        ctx.fx.rel(c.id, t.id, "relation", -8, "Concessione imposta");
        ctx.fx.rel(c.id, t.id, "tension", 8, "Concessione imposta");
        ctx.lines.push(`${t.name} cede alle pressioni: 40 fondi trasferiti.`);
      } else {
        ctx.success = false;
        ctx.fx.rel(c.id, t.id, "relation", -10, "Richiesta di concessione respinta");
        ctx.fx.rel(c.id, t.id, "tension", 10, "Richiesta di concessione respinta");
        ctx.fx.stat(c.id, "influence", -3, "Richiesta respinta pubblicamente");
        ctx.lines.push(`${t.name} respinge la richiesta: prestigio danneggiato.`);
      }
    },
  },
  diplomatic_warning: {
    id: "diplomatic_warning",
    category: "diplomacy",
    name: "Avvertimento diplomatico",
    description: "Un monito formale: segnala una linea rossa, alzando la tensione.",
    apCost: 1,
    needsTarget: true,
    apply: (ctx) => {
      const t = ctx.target!;
      ctx.fx.rel(ctx.country.id, t.id, "tension", 6, "Avvertimento diplomatico");
      ctx.fx.rel(ctx.country.id, t.id, "relation", -4, "Avvertimento diplomatico");
      ctx.fx.stat(ctx.country.id, "influence", 1, "Fermezza diplomatica");
      ctx.lines.push(`Avvertimento formale notificato a ${t.name}.`);
    },
  },
  recognize_government: {
    id: "recognize_government",
    category: "diplomacy",
    name: "Riconosci governo",
    description: "Riconoscimento ufficiale: rafforza la legittimità del bersaglio e le relazioni.",
    apCost: 1,
    needsTarget: true,
    cooldown: 3,
    apply: (ctx) => {
      const t = ctx.target!;
      ctx.fx.stat(t.id, "legitimacy", 4, `Riconoscimento da ${ctx.country.name}`);
      ctx.fx.rel(ctx.country.id, t.id, "relation", 6, "Riconoscimento ufficiale");
      ctx.fx.rel(ctx.country.id, t.id, "trust", 5, "Riconoscimento ufficiale");
      ctx.lines.push(`Governo di ${t.name} riconosciuto ufficialmente.`);
    },
  },
  break_treaty: {
    id: "break_treaty",
    category: "diplomacy",
    name: "Rompi trattato",
    description: "Ripudia unilateralmente un trattato attivo. Grave danno a fiducia e reputazione.",
    apCost: 1,
    needsTarget: true,
    risk: "Perdita di fiducia con tutti: la reputazione internazionale ne risente.",
    prereq: (doc, country, target) => {
      if (!target) return "Serve un paese bersaglio.";
      const key = pairKey(country.id, target.id);
      const found = doc.treaties.some(
        (t) => t.status === "active" && pairKey(t.parties[0], t.parties[1]) === key,
      );
      return found ? null : "Nessun trattato attivo con questo paese.";
    },
    apply: (ctx) => {
      const t = ctx.target!;
      const key = pairKey(ctx.country.id, t.id);
      const treaty = ctx.doc.treaties.find(
        (x) => x.status === "active" && pairKey(x.parties[0], x.parties[1]) === key,
      );
      if (!treaty) return;
      treaty.status = "broken";
      ctx.fx.rel(ctx.country.id, t.id, "relation", -18, `Trattato (${TREATY_LABELS[treaty.type]}) ripudiato`);
      ctx.fx.rel(ctx.country.id, t.id, "trust", -20, "Trattato ripudiato");
      ctx.fx.rel(ctx.country.id, t.id, "tension", 12, "Trattato ripudiato");
      ctx.fx.stat(ctx.country.id, "influence", -4, "Reputazione di inaffidabilità");
      ctx.fx.world(3, `${ctx.country.name} ripudia un trattato`);
      ctx.lines.push(`Trattato di ${TREATY_LABELS[treaty.type]} con ${t.name} ripudiato.`);
    },
  },

  // ── Economia ──────────────────────────────────────────────────
  invest_infrastructure: {
    id: "invest_infrastructure",
    category: "economy",
    name: "Investi in infrastrutture",
    description: "Investimento strutturale: aumenta reddito e capacità commerciale in modo permanente.",
    apCost: 2,
    treasuryCost: 80,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "income", 5, "Investimenti infrastrutturali");
      ctx.fx.stat(ctx.country.id, "tradeCapacity", 3, "Investimenti infrastrutturali");
      ctx.lines.push("Programma infrastrutturale avviato: +5 reddito per turno.");
    },
  },
  subsidize_industry: {
    id: "subsidize_industry",
    category: "economy",
    name: "Sussidi all'industria",
    description: "Sostiene i settori strategici: più capacità commerciale e consenso.",
    apCost: 1,
    treasuryCost: 60,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "tradeCapacity", 4, "Sussidi industriali");
      ctx.fx.stat(ctx.country.id, "publicSupport", 3, "Sussidi industriali");
      ctx.lines.push("Sussidi erogati ai settori strategici.");
    },
  },
  raise_taxes: {
    id: "raise_taxes",
    category: "economy",
    name: "Aumenta le tasse",
    description: "Più entrate subito, ma stabilità e consenso ne soffrono.",
    apCost: 1,
    cooldown: 2,
    risk: "La stabilità e il consenso calano.",
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "income", 6, "Aumento della pressione fiscale");
      ctx.fx.stat(ctx.country.id, "stability", -4, "Malcontento fiscale");
      ctx.fx.stat(ctx.country.id, "publicSupport", -5, "Malcontento fiscale");
      ctx.lines.push("Riforma fiscale approvata: +6 reddito, malcontento in crescita.");
    },
  },
  cut_taxes: {
    id: "cut_taxes",
    category: "economy",
    name: "Riduci le tasse",
    description: "Meno entrate, più consenso e stabilità.",
    apCost: 1,
    cooldown: 2,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "income", -5, "Riduzione fiscale");
      ctx.fx.stat(ctx.country.id, "stability", 3, "Sollievo fiscale");
      ctx.fx.stat(ctx.country.id, "publicSupport", 5, "Sollievo fiscale");
      ctx.lines.push("Taglio delle tasse approvato.");
    },
  },
  impose_sanctions: {
    id: "impose_sanctions",
    category: "economy",
    name: "Imponi sanzioni",
    description: "Colpisce l'economia del bersaglio. Alza la tensione e riduce anche il tuo commercio.",
    apCost: 2,
    needsTarget: true,
    risk: "La tensione bilaterale sale e parte del tuo commercio si perde.",
    prereq: (doc, country, target) => {
      if (!target) return "Serve un paese bersaglio.";
      const exists = doc.sanctions.some(
        (s) => s.active && s.source === country.id && s.target === target.id,
      );
      return exists ? "Hai già sanzioni attive contro questo paese." : null;
    },
    apply: (ctx) => {
      const t = ctx.target!;
      ctx.doc.sanctions.push({
        id: `sanc_${ctx.doc.seed}_${ctx.doc.sanctions.length}`,
        source: ctx.country.id,
        target: t.id,
        imposedTurn: ctx.doc.turn,
        active: true,
      });
      ctx.fx.stat(t.id, "sanctionPressure", 12, `Sanzioni di ${ctx.country.name}`);
      ctx.fx.stat(t.id, "tradeCapacity", -6, `Sanzioni di ${ctx.country.name}`);
      ctx.fx.stat(ctx.country.id, "tradeCapacity", -2, "Commercio interrotto dalle sanzioni");
      ctx.fx.rel(ctx.country.id, t.id, "relation", -12, "Sanzioni economiche");
      ctx.fx.rel(ctx.country.id, t.id, "tension", 10, "Sanzioni economiche");
      ctx.fx.world(2, "Nuove sanzioni economiche");
      ctx.lines.push(`Regime di sanzioni imposto contro ${t.name}.`);
    },
  },
  lift_sanctions: {
    id: "lift_sanctions",
    category: "economy",
    name: "Rimuovi sanzioni",
    description: "Revoca le sanzioni: distende le relazioni e ripristina il commercio.",
    apCost: 1,
    needsTarget: true,
    prereq: (doc, country, target) => {
      if (!target) return "Serve un paese bersaglio.";
      const exists = doc.sanctions.some(
        (s) => s.active && s.source === country.id && s.target === target.id,
      );
      return exists ? null : "Nessuna sanzione attiva contro questo paese.";
    },
    apply: (ctx) => {
      const t = ctx.target!;
      for (const s of ctx.doc.sanctions) {
        if (s.active && s.source === ctx.country.id && s.target === t.id) s.active = false;
      }
      ctx.fx.stat(t.id, "sanctionPressure", -12, `Sanzioni revocate da ${ctx.country.name}`);
      ctx.fx.stat(t.id, "tradeCapacity", 6, "Sanzioni revocate");
      ctx.fx.stat(ctx.country.id, "tradeCapacity", 2, "Commercio ripristinato");
      ctx.fx.rel(ctx.country.id, t.id, "relation", 8, "Sanzioni revocate");
      ctx.fx.rel(ctx.country.id, t.id, "tension", -8, "Sanzioni revocate");
      ctx.lines.push(`Sanzioni contro ${t.name} revocate.`);
    },
  },
  restrict_imports: {
    id: "restrict_imports",
    category: "economy",
    name: "Limita le importazioni",
    description: "Protezionismo: sostiene l'industria nazionale ma irrita i partner commerciali.",
    apCost: 1,
    cooldown: 3,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "income", 3, "Dazi protezionistici");
      ctx.fx.stat(ctx.country.id, "tradeCapacity", -4, "Barriere commerciali");
      for (const t of ctx.doc.treaties) {
        if (t.status === "active" && t.type === "trade" && t.parties.includes(ctx.country.id)) {
          const other = t.parties[0] === ctx.country.id ? t.parties[1] : t.parties[0];
          ctx.fx.rel(ctx.country.id, other, "relation", -4, "Barriere alle importazioni");
        }
      }
      ctx.lines.push("Barriere alle importazioni introdotte.");
    },
  },
  seek_investment: {
    id: "seek_investment",
    category: "economy",
    name: "Attrai investimenti esteri",
    description: "Roadshow internazionale: entrate straordinarie proporzionali a influenza e stabilità.",
    apCost: 1,
    cooldown: 2,
    apply: (ctx) => {
      const c = ctx.country;
      const gain = Math.round(30 + (c.stats.influence + c.stats.stability) / 2);
      ctx.fx.stat(c.id, "treasury", gain, "Investimenti esteri attratti");
      ctx.lines.push(`Investitori convinti: +${gain} fondi.`);
    },
  },
  emergency_package: {
    id: "emergency_package",
    category: "economy",
    name: "Pacchetto economico d'emergenza",
    description: "Spesa massiccia per calmare il paese: stabilità e consenso su, debito su.",
    apCost: 2,
    treasuryCost: 120,
    cooldown: 3,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "stability", 8, "Pacchetto d'emergenza");
      ctx.fx.stat(ctx.country.id, "publicSupport", 6, "Pacchetto d'emergenza");
      ctx.fx.stat(ctx.country.id, "debt", 8, "Spesa in deficit");
      ctx.lines.push("Pacchetto d'emergenza varato.");
    },
  },

  // ── Politica interna ─────────────────────────────────────────
  public_speech: {
    id: "public_speech",
    category: "internal",
    name: "Discorso alla nazione",
    description: "Il leader parla al paese. L'effetto dipende dal suo carisma.",
    apCost: 1,
    apply: (ctx) => {
      const charisma = ctx.country.leader.traits.includes("Carismatico") ? 3 : 0;
      const populist = ctx.country.leader.traits.includes("Populista") ? 1 : 0;
      ctx.fx.stat(ctx.country.id, "publicSupport", 3 + charisma + populist, "Discorso alla nazione");
      ctx.fx.stat(ctx.country.id, "legitimacy", 1, "Discorso alla nazione");
      ctx.lines.push(
        charisma > 0
          ? "Il discorso infiamma la piazza: il carisma del leader amplifica l'effetto."
          : "Discorso trasmesso a reti unificate.",
      );
    },
  },
  anticorruption: {
    id: "anticorruption",
    category: "internal",
    name: "Campagna anticorruzione",
    description: "Colpisce le reti clientelari: meno corruzione, più legittimità, ma attriti nel breve.",
    apCost: 2,
    cooldown: 2,
    risk: "Le purghe creano attriti: -2 stabilità nel breve periodo.",
    apply: (ctx) => {
      const corrupt = ctx.country.leader.traits.includes("Corrotto");
      ctx.fx.stat(ctx.country.id, "corruption", corrupt ? -3 : -7, "Campagna anticorruzione");
      ctx.fx.stat(ctx.country.id, "legitimacy", 4, "Campagna anticorruzione");
      ctx.fx.stat(ctx.country.id, "stability", -2, "Resistenze degli apparati");
      ctx.lines.push(
        corrupt
          ? "La campagna procede a rilento: le reti del leader stesso la ostacolano."
          : "Arresti eccellenti: la corruzione arretra.",
      );
    },
  },
  political_reform: {
    id: "political_reform",
    category: "internal",
    name: "Riforma politica",
    description: "Riforma istituzionale: legittimità in crescita, transizione turbolenta.",
    apCost: 2,
    cooldown: 3,
    apply: (ctx) => {
      const reformer = ctx.country.leader.traits.includes("Riformista");
      ctx.fx.stat(ctx.country.id, "legitimacy", reformer ? 8 : 5, "Riforma politica");
      ctx.fx.stat(ctx.country.id, "stability", -3, "Transizione istituzionale");
      ctx.lines.push("Riforma istituzionale approvata.");
    },
  },
  emergency_decree: {
    id: "emergency_decree",
    category: "internal",
    name: "Decreto d'emergenza",
    description: "Poteri straordinari: stabilità immediata al prezzo della legittimità.",
    apCost: 1,
    risk: "La legittimità democratica ne esce erosa.",
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "stability", 6, "Decreto d'emergenza");
      ctx.fx.stat(ctx.country.id, "legitimacy", -5, "Poteri straordinari");
      ctx.lines.push("Decreto d'emergenza in vigore.");
    },
  },
  media_campaign: {
    id: "media_campaign",
    category: "internal",
    name: "Campagna mediatica",
    description: "Operazione di comunicazione: consenso e influenza in crescita.",
    apCost: 1,
    treasuryCost: 40,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "publicSupport", 4, "Campagna mediatica");
      ctx.fx.stat(ctx.country.id, "influence", 2, "Narrazione internazionale");
      ctx.lines.push("Campagna mediatica lanciata.");
    },
  },
  regional_investment: {
    id: "regional_investment",
    category: "internal",
    name: "Investimento regionale",
    description: "Fondi mirati a una regione: sviluppo su, malcontento giù.",
    apCost: 1,
    treasuryCost: 60,
    needsRegion: true,
    prereq: (_doc, country) =>
      country.regions.length === 0 ? "Nessun dato regionale disponibile per questo paese." : null,
    apply: (ctx) => {
      const regionId = (ctx.action.payload?.regionId as string) ?? ctx.country.regions[0]?.id;
      const region = ctx.country.regions.find((r) => r.id === regionId);
      if (!region) {
        ctx.success = false;
        ctx.lines.push("Regione non trovata.");
        return;
      }
      region.development = Math.min(100, region.development + 5);
      region.unrest = Math.max(0, region.unrest - 6);
      ctx.fx.stat(ctx.country.id, "stability", 2, `Investimenti in ${region.name}`);
      ctx.lines.push(`Fondi stanziati per ${region.name}: sviluppo +5, malcontento -6.`);
    },
  },
  stabilization_package: {
    id: "stabilization_package",
    category: "internal",
    name: "Pacchetto di stabilizzazione",
    description: "Misure ad ampio spettro per raffreddare la crisi interna.",
    apCost: 2,
    treasuryCost: 100,
    cooldown: 2,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "stability", 7, "Pacchetto di stabilizzazione");
      ctx.lines.push("Misure di stabilizzazione operative.");
    },
  },
  investigate_crisis: {
    id: "investigate_crisis",
    category: "internal",
    name: "Indaga sulla crisi interna",
    description: "Commissione d'inchiesta: individua la regione più instabile e ne riduce il malcontento.",
    apCost: 1,
    apply: (ctx) => {
      const worst = [...ctx.country.regions].sort((a, b) => b.unrest - a.unrest)[0];
      if (worst) {
        worst.unrest = Math.max(0, worst.unrest - 4);
        ctx.lines.push(`L'inchiesta individua l'epicentro della crisi: ${worst.name} (malcontento -4).`);
      } else {
        ctx.lines.push("L'inchiesta non rileva focolai di crisi significativi.");
      }
      ctx.fx.stat(ctx.country.id, "stability", 1, "Crisi mappata e contenuta");
    },
  },

  // ── Intelligence ──────────────────────────────────────────────
  gather_intel: {
    id: "gather_intel",
    category: "intelligence",
    name: "Raccogli informazioni",
    description: "Operazione di intelligence: rivela lo stato interno di un paese in un rapporto riservato.",
    apCost: 1,
    needsTarget: true,
    successChance: (_doc, c, t) =>
      Math.min(0.95, 0.6 + (c.stats.research - (t?.stats.research ?? 50)) / 200),
    risk: "Se scoperta, l'operazione danneggia le relazioni.",
    apply: (ctx) => {
      const t = ctx.target!;
      if (ctx.success) {
        ctx.doc.briefings.push({
          id: `brief_${ctx.doc.seed}_${ctx.doc.briefings.length}`,
          turn: ctx.doc.turn,
          recipientCountryId: ctx.country.id,
          title: `Dossier su ${t.name}`,
          content:
            `Stabilità ${Math.round(t.stats.stability)}, tesoro ~${Math.round(t.stats.treasury / 10) * 10}, ` +
            `prontezza militare ${Math.round(t.stats.militaryReadiness)}, ` +
            `corruzione ${Math.round(t.stats.corruption)}, postura nucleare ${Math.round(t.stats.nuclearPosture)}. ` +
            `Punto debole del leader: ${t.leader.weakness.toLowerCase()}.`,
          severity: "info",
          source: "rules",
          at: new Date().toISOString(),
        });
        ctx.lines.push(`Dossier completo su ${t.name} consegnato ai tuoi servizi.`);
      } else {
        ctx.lines.push(`L'operazione su ${t.name} non produce risultati utili.`);
      }
    },
  },
  counter_intelligence: {
    id: "counter_intelligence",
    category: "intelligence",
    name: "Controspionaggio",
    description: "Rafforza le difese contro operazioni ostili per i prossimi turni.",
    apCost: 1,
    cooldown: 2,
    apply: (ctx) => {
      ctx.doc.flags.push({
        countryId: ctx.country.id,
        flag: "trust_bonus",
        remainingTurns: 2,
        reason: "Rete di controspionaggio attiva",
      });
      ctx.fx.stat(ctx.country.id, "research", 1, "Investimenti nei servizi");
      ctx.lines.push("Rete di controspionaggio rafforzata per 2 turni.");
    },
  },
  influence_campaign: {
    id: "influence_campaign",
    category: "intelligence",
    name: "Campagna di influenza",
    description: "Operazione informativa che erode il consenso interno del bersaglio.",
    apCost: 2,
    needsTarget: true,
    cooldown: 2,
    successChance: () => 0.65,
    risk: "Alto rischio di attribuzione: se scoperta, grave crisi diplomatica.",
    apply: (ctx) => {
      const t = ctx.target!;
      if (ctx.success) {
        ctx.fx.stat(t.id, "publicSupport", -5, "Campagna di influenza ostile");
        ctx.lines.push(`La campagna erode il consenso interno di ${t.name}.`);
      } else {
        ctx.lines.push("La campagna viene neutralizzata prima di produrre effetti.");
      }
      if (ctx.rng() < 0.3) {
        markDiscovered(ctx, t.id);
      }
    },
  },
  leak_information: {
    id: "leak_information",
    category: "intelligence",
    name: "Diffondi informazioni riservate",
    description: "Fa trapelare documenti compromettenti: colpisce la legittimità del bersaglio.",
    apCost: 2,
    needsTarget: true,
    cooldown: 2,
    successChance: () => 0.6,
    risk: "Se la fuga viene ricondotta a te, fiducia azzerata.",
    apply: (ctx) => {
      const t = ctx.target!;
      if (ctx.success) {
        ctx.fx.stat(t.id, "legitimacy", -6, "Fuga di documenti riservati");
        ctx.doc.worldEvents.push({
          id: `we_${ctx.doc.seed}_${ctx.doc.worldEvents.length}`,
          turn: ctx.doc.turn,
          headline: `Documenti riservati imbarazzano il governo di ${t.name}`,
          description: "Una fuga di notizie di origine ignota scuote il palazzo.",
          affectedCountryIds: [t.id],
          source: "rules",
          at: new Date().toISOString(),
        });
        ctx.lines.push(`I documenti trapelati scuotono il governo di ${t.name}.`);
      } else {
        ctx.lines.push("La fuga di notizie viene smentita e cade nel vuoto.");
      }
      if (ctx.rng() < 0.35) {
        markDiscovered(ctx, t.id);
      }
    },
  },
  spy_negotiations: {
    id: "spy_negotiations",
    category: "intelligence",
    name: "Spia i negoziati",
    description: "Intercetta la diplomazia del bersaglio: rivela trattati e proposte in corso.",
    apCost: 1,
    needsTarget: true,
    successChance: () => 0.7,
    apply: (ctx) => {
      const t = ctx.target!;
      if (ctx.success) {
        const items = ctx.doc.treaties
          .filter((x) => x.parties.includes(t.id) && (x.status === "proposed" || x.status === "active"))
          .map((x) => {
            const other = x.parties[0] === t.id ? x.parties[1] : x.parties[0];
            const otherName = ctx.doc.countries[other]?.name ?? other;
            return `${TREATY_LABELS[x.type]} con ${otherName} (${x.status === "active" ? "attivo" : "in trattativa"})`;
          });
        ctx.doc.briefings.push({
          id: `brief_${ctx.doc.seed}_${ctx.doc.briefings.length}`,
          turn: ctx.doc.turn,
          recipientCountryId: ctx.country.id,
          title: `Intercettazioni diplomatiche — ${t.name}`,
          content: items.length
            ? `Dossier negoziale: ${items.join("; ")}.`
            : `${t.name} non ha trattative rilevanti in corso.`,
          severity: "info",
          source: "rules",
          at: new Date().toISOString(),
        });
        ctx.lines.push(`Intercettazioni sui negoziati di ${t.name} completate.`);
      } else {
        ctx.lines.push("Le comunicazioni del bersaglio risultano cifrate: nulla di utile.");
      }
    },
  },
  sabotage_trust: {
    id: "sabotage_trust",
    category: "intelligence",
    name: "Sabota la fiducia diplomatica",
    description: "Disinformazione mirata per incrinare i rapporti del bersaglio con i suoi partner.",
    apCost: 2,
    needsTarget: true,
    cooldown: 3,
    successChance: () => 0.55,
    risk: "Rischio molto alto: se scoperta, crisi diplomatica e tensione globale.",
    apply: (ctx) => {
      const t = ctx.target!;
      if (ctx.success) {
        const partners = ctx.doc.treaties
          .filter((x) => x.status === "active" && x.parties.includes(t.id))
          .map((x) => (x.parties[0] === t.id ? x.parties[1] : x.parties[0]))
          .filter((p) => p !== ctx.country.id);
        const victim = partners[Math.floor(ctx.rng() * partners.length)];
        if (victim) {
          ctx.fx.rel(t.id, victim, "trust", -8, "Disinformazione di origine ignota");
          ctx.fx.rel(t.id, victim, "relation", -5, "Disinformazione di origine ignota");
          ctx.lines.push(
            `La disinformazione incrina i rapporti tra ${t.name} e ${ctx.doc.countries[victim]?.name ?? victim}.`,
          );
        } else {
          ctx.lines.push(`${t.name} non ha partner abbastanza stretti da sabotare.`);
        }
      } else {
        ctx.lines.push("L'operazione di disinformazione non attecchisce.");
      }
      if (ctx.rng() < 0.4) {
        markDiscovered(ctx, t.id);
        ctx.fx.world(2, "Operazione di disinformazione smascherata");
      }
    },
  },

  // ── Militare e crisi ─────────────────────────────────────────
  increase_readiness: {
    id: "increase_readiness",
    category: "military",
    name: "Aumenta la prontezza",
    description: "Addestramento e logistica: le forze armate salgono di livello operativo.",
    apCost: 1,
    treasuryCost: 40,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "militaryReadiness", 6, "Programma di prontezza operativa");
      ctx.lines.push("Prontezza militare aumentata.");
    },
  },
  military_exercise: {
    id: "military_exercise",
    category: "military",
    name: "Esercitazione militare",
    description: "Manovre su larga scala: prontezza su, ma i vicini si allarmano.",
    apCost: 1,
    treasuryCost: 30,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "militaryReadiness", 4, "Esercitazione su larga scala");
      const rels = Object.keys(ctx.doc.relations).filter((k) => k.includes(ctx.country.id));
      for (const key of rels.slice(0, 6)) {
        const [a, b] = key.split("|");
        const other = a === ctx.country.id ? b : a;
        ctx.fx.rel(ctx.country.id, other, "tension", 2, "Esercitazioni militari vicino ai confini");
      }
      ctx.lines.push("Esercitazione conclusa: i paesi vicini osservano con preoccupazione.");
    },
  },
  mobilization: {
    id: "mobilization",
    category: "military",
    name: "Mobilitazione",
    description: "Richiamo dei riservisti: grande balzo di prontezza, forte allarme internazionale.",
    apCost: 2,
    treasuryCost: 80,
    cooldown: 3,
    risk: "La tensione sale con tutti e la stabilità interna cala.",
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "militaryReadiness", 12, "Mobilitazione generale");
      ctx.fx.stat(ctx.country.id, "stability", -3, "Economia di guerra");
      ctx.fx.world(4, `Mobilitazione generale di ${ctx.country.name}`);
      ctx.lines.push("Mobilitazione in corso: il mondo osserva.");
    },
  },
  border_deployment: {
    id: "border_deployment",
    category: "military",
    name: "Schieramento al confine",
    description: "Truppe schierate verso un paese specifico: deterrenza e tensione bilaterale.",
    apCost: 1,
    needsTarget: true,
    apply: (ctx) => {
      const t = ctx.target!;
      ctx.fx.rel(ctx.country.id, t.id, "tension", 10, "Schieramento di truppe al confine");
      ctx.fx.stat(ctx.country.id, "militaryReadiness", 2, "Dispiegamento avanzato");
      ctx.lines.push(`Forze schierate in direzione di ${t.name}.`);
    },
  },
  de_escalate: {
    id: "de_escalate",
    category: "military",
    name: "De-escalation",
    description: "Ritiro visibile e canali riservati: riduce la tensione con un paese.",
    apCost: 1,
    needsTarget: true,
    apply: (ctx) => {
      const t = ctx.target!;
      ctx.fx.rel(ctx.country.id, t.id, "tension", -12, "Iniziativa di de-escalation");
      ctx.fx.rel(ctx.country.id, t.id, "trust", 3, "Iniziativa di de-escalation");
      ctx.fx.world(-1, "Segnali di distensione");
      ctx.lines.push(`Iniziativa di distensione avviata verso ${t.name}.`);
    },
  },
  declare_war: {
    id: "declare_war",
    category: "military",
    name: "Dichiara guerra",
    description: "L'atto più grave: apre un conflitto armato. Richiede prontezza, una giustificazione e nessun patto di non aggressione.",
    apCost: 3,
    risk: "Stabilità e reputazione crollano; l'esito dipende da forza e prontezza relative.",
    needsTarget: true,
    prereq: (doc, country, target) => {
      if (!target) return "Serve un paese bersaglio.";
      if (activeWar(doc, country.id, target.id)) return "Siete già in guerra.";
      if (country.stats.militaryReadiness < 50)
        return "Prontezza militare insufficiente (minimo 50).";
      if (hasActiveTreaty(doc, country.id, target.id, "non_aggression"))
        return "Un patto di non aggressione è in vigore: rompilo prima.";
      if (hasActiveTreaty(doc, country.id, target.id, "alliance"))
        return "Non puoi dichiarare guerra a un alleato: rompi prima l'alleanza.";
      const rel = doc.relations[pairKey(country.id, target.id)];
      const hostile = (rel?.relation ?? 0) <= -20 || (rel?.tension ?? 0) >= 50;
      const sanctioned = doc.sanctions.some(
        (s) => s.active && ((s.source === target.id && s.target === country.id) || (s.source === country.id && s.target === target.id)),
      );
      const brokenTreaty = doc.treaties.some(
        (t) => t.status === "broken" && t.parties.includes(country.id) && t.parties.includes(target.id),
      );
      if (!hostile && !sanctioned && !brokenTreaty)
        return "Nessuna giustificazione sufficiente: servono relazioni ostili, tensione alta, sanzioni o un trattato rotto.";
      return null;
    },
    apply: (ctx) => {
      const t = ctx.target!;
      ctx.doc.wars.push({
        id: `war_${ctx.doc.seed}_${ctx.doc.wars.length}`,
        attacker: ctx.country.id,
        defender: t.id,
        startedTurn: ctx.doc.turn,
        status: "active",
        endedTurn: null,
        exhaustion: { [ctx.country.id]: 0, [t.id]: 0 },
        score: 0,
      });
      ctx.fx.rel(ctx.country.id, t.id, "relation", -40, "Dichiarazione di guerra");
      ctx.fx.rel(ctx.country.id, t.id, "tension", 40, "Dichiarazione di guerra");
      ctx.fx.rel(ctx.country.id, t.id, "trust", -30, "Dichiarazione di guerra");
      ctx.fx.stat(ctx.country.id, "stability", -6, "Il paese entra in guerra");
      ctx.fx.stat(ctx.country.id, "influence", -5, "Condanna internazionale");
      ctx.fx.world(10, `${ctx.country.name} dichiara guerra a ${t.name}`);
      ctx.doc.worldEvents.push({
        id: `we_${ctx.doc.seed}_${ctx.doc.worldEvents.length}`,
        turn: ctx.doc.turn,
        headline: `GUERRA: ${ctx.country.name} attacca ${t.name}`,
        description: "Le cancellerie di tutto il mondo convocano riunioni d'emergenza.",
        affectedCountryIds: [ctx.country.id, t.id],
        source: "rules",
        at: new Date().toISOString(),
      });
      ctx.lines.push(`Guerra dichiarata a ${t.name}.`);
    },
  },
  offer_ceasefire: {
    id: "offer_ceasefire",
    category: "military",
    name: "Offri cessate il fuoco",
    description: "Congela il conflitto: le ostilità si fermano in attesa di una pace.",
    apCost: 1,
    needsTarget: true,
    prereq: (doc, country, target) => {
      if (!target) return "Serve un paese bersaglio.";
      return activeWar(doc, country.id, target.id) ? null : "Non c'è una guerra attiva con questo paese.";
    },
    apply: (ctx) => {
      const t = ctx.target!;
      const war = activeWar(ctx.doc, ctx.country.id, t.id)!;
      war.status = "ceasefire";
      ctx.fx.rel(ctx.country.id, t.id, "tension", -15, "Cessate il fuoco");
      ctx.fx.world(-3, "Cessate il fuoco concordato");
      ctx.lines.push(`Cessate il fuoco in vigore con ${t.name}.`);
    },
  },
  prepare_defense: {
    id: "prepare_defense",
    category: "military",
    name: "Prepara la difesa",
    description: "Fortificazioni e piani difensivi: riduce i danni se attaccato.",
    apCost: 1,
    treasuryCost: 40,
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "militaryReadiness", 3, "Preparativi difensivi");
      ctx.fx.stat(ctx.country.id, "militaryStrength", 2, "Fortificazioni");
      ctx.lines.push("Linee difensive rafforzate.");
    },
  },
  raise_nuclear_posture: {
    id: "raise_nuclear_posture",
    category: "military",
    name: "Alza la postura nucleare",
    description: "Deterrenza strategica astratta: scoraggia gli attacchi ma spaventa il mondo intero.",
    apCost: 3,
    cooldown: 3,
    risk: "Fiducia in caduta con tutti, tensione globale in forte aumento.",
    prereq: (_doc, country) => {
      if (country.stats.nuclearPosture === 0 && country.stats.research < 70)
        return "Serve un livello di ricerca di almeno 70 per sviluppare la deterrenza.";
      return null;
    },
    apply: (ctx) => {
      const first = ctx.country.stats.nuclearPosture === 0;
      ctx.fx.stat(ctx.country.id, "nuclearPosture", first ? 20 : 10, "Escalation della postura nucleare");
      ctx.fx.world(first ? 8 : 5, `Escalation nucleare di ${ctx.country.name}`);
      for (const key of Object.keys(ctx.doc.relations)) {
        if (!key.includes(ctx.country.id)) continue;
        const [a, b] = key.split("|");
        const other = a === ctx.country.id ? b : a;
        ctx.fx.rel(ctx.country.id, other, "trust", -4, "Escalation nucleare");
      }
      if (first) {
        ctx.doc.worldEvents.push({
          id: `we_${ctx.doc.seed}_${ctx.doc.worldEvents.length}`,
          turn: ctx.doc.turn,
          headline: `${ctx.country.name} entra nel club della deterrenza`,
          description: "Il programma strategico nazionale raggiunge la capacità deterrente. Le diplomazie sono in allarme.",
          affectedCountryIds: [ctx.country.id],
          source: "rules",
          at: new Date().toISOString(),
        });
      }
      ctx.lines.push("Postura nucleare innalzata: la deterrenza cresce, la fiducia crolla.");
    },
  },
  lower_nuclear_posture: {
    id: "lower_nuclear_posture",
    category: "military",
    name: "Riduci la postura nucleare",
    description: "Distensione strategica: un segnale di responsabilità che ricostruisce fiducia.",
    apCost: 1,
    prereq: (_doc, country) =>
      country.stats.nuclearPosture > 0 ? null : "La postura nucleare è già al minimo.",
    apply: (ctx) => {
      ctx.fx.stat(ctx.country.id, "nuclearPosture", -10, "Distensione nucleare");
      ctx.fx.world(-4, `Distensione nucleare di ${ctx.country.name}`);
      ctx.fx.stat(ctx.country.id, "influence", 2, "Leadership responsabile");
      ctx.lines.push("Postura nucleare ridotta: il mondo tira un sospiro di sollievo.");
    },
  },
};

function markDiscovered(ctx: ActionContext, targetId: string) {
  const op = ctx.doc.intelOps[ctx.doc.intelOps.length - 1];
  if (op) op.discovered = true;
  ctx.fx.rel(ctx.country.id, targetId, "relation", -10, "Operazione di intelligence scoperta");
  ctx.fx.rel(ctx.country.id, targetId, "tension", 8, "Operazione di intelligence scoperta");
  ctx.fx.rel(ctx.country.id, targetId, "trust", -10, "Operazione di intelligence scoperta");
  ctx.lines.push("⚠ L'operazione è stata scoperta: crisi diplomatica con il bersaglio.");
  ctx.doc.briefings.push({
    id: `brief_${ctx.doc.seed}_${ctx.doc.briefings.length}`,
    turn: ctx.doc.turn,
    recipientCountryId: targetId,
    title: "Operazione ostile smascherata",
    content: `I nostri servizi hanno attribuito un'operazione di intelligence ostile a ${ctx.country.name}.`,
    severity: "warning",
    source: "rules",
    at: new Date().toISOString(),
  });
}

export const ACTION_LIST = Object.values(ACTIONS);

export const CATEGORY_LABELS: Record<ActionCategory, string> = {
  diplomacy: "Diplomazia",
  economy: "Economia",
  internal: "Politica interna",
  intelligence: "Intelligence",
  military: "Difesa",
};

/**
 * Validates an action submission. Returns an Italian error string or null.
 * Runs both at submission time and again at resolution time.
 */
export function validateAction(
  doc: GameDoc,
  countryId: string,
  type: string,
  targetCountryId: string | null,
  payload: Record<string, unknown> | null,
): string | null {
  const def = ACTIONS[type];
  if (!def) return "Azione sconosciuta.";
  const country = doc.countries[countryId];
  if (!country) return "Paese non trovato.";
  if (country.stats.actionPoints < def.apCost)
    return `Punti azione insufficienti (servono ${def.apCost}).`;
  if (def.treasuryCost && country.stats.treasury < def.treasuryCost)
    return `Fondi insufficienti (servono ${def.treasuryCost}).`;
  const cdKey = `${countryId}|${type}`;
  const availableAt = doc.cooldowns[cdKey];
  if (availableAt !== undefined && doc.turn < availableAt)
    return `Azione in ricarica: disponibile dal turno ${availableAt}.`;
  let target: CountryState | null = null;
  if (def.needsTarget) {
    if (!targetCountryId) return "Serve un paese bersaglio.";
    if (targetCountryId === countryId) return "Non puoi bersagliare il tuo stesso paese.";
    target = doc.countries[targetCountryId] ?? null;
    if (!target) return "Paese bersaglio non trovato.";
  }
  if (def.needsText) {
    const body = payload?.body;
    if (typeof body !== "string" || body.trim().length === 0)
      return "Il messaggio non può essere vuoto.";
    if (body.length > 1200) return "Messaggio troppo lungo (max 1200 caratteri).";
  }
  if (def.prereq) {
    const reason = def.prereq(doc, country, target);
    if (reason) return reason;
  }
  return null;
}
