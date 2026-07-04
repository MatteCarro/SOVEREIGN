import {
  ActionResolution,
  EffectLog,
  GameDoc,
  PrivateBriefing,
  Treaty,
  TurnResolutionReport,
  WorldEvent,
  pairKey,
} from "@/lib/types";
import { ACTIONS, validateAction } from "./actions";
import { Fx, getRelation } from "./effects";
import { turnRng, Rng } from "./rng";
import { BASE_ACTION_POINTS } from "@/lib/countries/seeds";
import type { TurnAIAnalysis } from "@/lib/ai/schema";

/**
 * Turn resolution pipeline (server-only):
 *  1. actions are locked  →  2. validated  →  3. deterministic effects
 *  →  4. AI analysis (optional, already validated by the caller)
 *  →  5. bounded AI diplomatic effects  →  6. passive world updates
 *  →  7. new turn starts.
 *
 * The AI can never create resources, armies, wars or treaties: its output
 * is converted into small clamped relation/tension/flag effects here.
 */

const CATEGORY_ORDER = ["diplomacy", "economy", "internal", "intelligence", "military"];

/** Per-pair per-turn cap for AI-derived relation/tension changes. */
const AI_MAX_RELATION_DELTA = 3;
const AI_MAX_TENSION_DELTA = 3;
const AI_MAX_SIGNALS = 24;
const AI_MAX_EVENTS = 6;
const AI_MAX_BRIEFINGS = 12;
const AI_MAX_FLAGS = 10;

export interface TurnInputSummary {
  turn: number;
  messages: {
    id: string;
    fromCountryId: string;
    fromName: string;
    toCountryId: string;
    toName: string;
    body: string;
  }[];
  actions: {
    countryId: string;
    countryName: string;
    type: string;
    targetCountryId: string | null;
    targetName: string | null;
  }[];
  wars: { attacker: string; defender: string; status: string }[];
  treaties: { type: string; parties: [string, string]; status: string }[];
  relations: { pair: string; relation: number; tension: number; trust: number }[];
  globalTension: number;
  playerCountries: { id: string; name: string; leaderName: string; leaderTraits: string[] }[];
}

/** Compact, structured summary of the turn handed to the AI resolver. */
export function buildTurnSummary(doc: GameDoc): TurnInputSummary {
  const name = (id: string) => doc.countries[id]?.name ?? id;
  const playerCountryIds = new Set(
    doc.players.map((p) => p.countryId).filter((c): c is string => Boolean(c)),
  );
  const turnMessages = doc.messages.filter((m) => m.turn === doc.turn).slice(-40);
  const turnActions = doc.actions.filter(
    (a) => a.turn === doc.turn && a.status === "pending" && a.type !== "send_message",
  );
  const involved = new Set<string>();
  for (const m of turnMessages) {
    involved.add(m.fromCountryId);
    involved.add(m.toCountryId);
  }
  for (const a of turnActions) {
    involved.add(a.countryId);
    if (a.targetCountryId) involved.add(a.targetCountryId);
  }
  for (const id of playerCountryIds) involved.add(id);

  const relations = Object.entries(doc.relations)
    .filter(([key]) => {
      const [a, b] = key.split("|");
      return involved.has(a) && involved.has(b);
    })
    .map(([key, rel]) => ({ pair: key, ...rel }));

  return {
    turn: doc.turn,
    messages: turnMessages.map((m) => ({
      id: m.id,
      fromCountryId: m.fromCountryId,
      fromName: name(m.fromCountryId),
      toCountryId: m.toCountryId,
      toName: name(m.toCountryId),
      body: m.body,
    })),
    actions: turnActions.map((a) => ({
      countryId: a.countryId,
      countryName: name(a.countryId),
      type: a.type,
      targetCountryId: a.targetCountryId,
      targetName: a.targetCountryId ? name(a.targetCountryId) : null,
    })),
    wars: doc.wars
      .filter((w) => w.status !== "ended")
      .map((w) => ({ attacker: name(w.attacker), defender: name(w.defender), status: w.status })),
    treaties: doc.treaties
      .filter((t) => t.status === "active" || t.status === "proposed")
      .slice(-30)
      .map((t) => ({ type: t.type, parties: t.parties, status: t.status })),
    relations,
    globalTension: doc.globalTension,
    playerCountries: [...playerCountryIds].map((id) => ({
      id,
      name: name(id),
      leaderName: doc.countries[id]?.leader.name ?? "",
      leaderTraits: doc.countries[id]?.leader.traits ?? [],
    })),
  };
}

function resolvePendingActions(doc: GameDoc, rng: Rng): ActionResolution[] {
  const results: ActionResolution[] = [];
  const pending = doc.actions
    .filter((a) => a.turn === doc.turn && a.status === "pending")
    .sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(ACTIONS[a.type]?.category ?? "");
      const cb = CATEGORY_ORDER.indexOf(ACTIONS[b.type]?.category ?? "");
      if (ca !== cb) return ca - cb;
      return a.submittedAt.localeCompare(b.submittedAt);
    });

  for (const action of pending) {
    const def = ACTIONS[action.type];
    const country = doc.countries[action.countryId];
    if (!def || !country) {
      action.status = "rejected";
      action.rejectReason = "Azione non valida.";
      continue;
    }
    // Messages were applied at submission time; just mark them resolved.
    if (action.type === "send_message") {
      action.status = "resolved";
      continue;
    }
    // Re-validate (world may have changed since submission). AP was already
    // deducted at submission; skip the AP check by temporarily crediting it.
    country.stats.actionPoints += def.apCost;
    const error = validateAction(doc, action.countryId, action.type, action.targetCountryId, action.payload);
    country.stats.actionPoints -= def.apCost;
    if (error) {
      action.status = "rejected";
      action.rejectReason = error;
      // Refund AP and treasury.
      country.stats.actionPoints = Math.min(12, country.stats.actionPoints + def.apCost);
      if (def.treasuryCost) country.stats.treasury += def.treasuryCost;
      results.push({
        actionId: action.id,
        actionType: action.type,
        countryId: action.countryId,
        targetCountryId: action.targetCountryId,
        success: false,
        lines: [`Azione annullata: ${error}`, "Punti azione e fondi rimborsati."],
        effects: [],
      });
      continue;
    }

    const fx = new Fx(doc, "rules");
    const target = action.targetCountryId ? doc.countries[action.targetCountryId] ?? null : null;
    const ctx = {
      doc, action, country, target, fx, rng,
      lines: [] as string[],
      success: true,
    };
    if (def.successChance) {
      const chance = def.successChance(doc, country, target);
      ctx.success = rng() < chance;
      if (def.category === "intelligence" && action.targetCountryId) {
        doc.intelOps.push({
          id: `op_${doc.seed}_${doc.intelOps.length}`,
          type: action.type as never,
          source: action.countryId,
          target: action.targetCountryId,
          turn: doc.turn,
          success: ctx.success,
          discovered: false,
        });
      }
    }
    def.apply(ctx);
    if (def.cooldown) {
      doc.cooldowns[`${action.countryId}|${action.type}`] = doc.turn + def.cooldown + 1;
    }
    action.status = "resolved";
    results.push({
      actionId: action.id,
      actionType: action.type,
      countryId: action.countryId,
      targetCountryId: action.targetCountryId,
      success: ctx.success,
      lines: ctx.lines,
      effects: fx.logs,
    });
  }
  return results;
}

/** AI-controlled (or unanswered) treaty responses, evaluated at turn end. */
function resolveTreatyProposals(doc: GameDoc, fx: Fx) {
  for (const treaty of doc.treaties) {
    if (treaty.status !== "proposed") continue;
    const receiver = treaty.parties.find((p) => p !== treaty.proposedBy)!;
    const receiverCountry = doc.countries[receiver];
    const isPlayer = receiverCountry?.control === "player";
    // Player-controlled receivers decide via the UI; expire after 2 turns.
    if (isPlayer) {
      if (doc.turn - treaty.proposedTurn >= 2) {
        treaty.status = "rejected";
        fx.rel(treaty.proposedBy, receiver, "trust", -2, "Proposta lasciata cadere");
      }
      continue;
    }
    const rel = getRelation(doc, treaty.parties[0], treaty.parties[1]);
    const threshold: Record<Treaty["type"], number> = {
      alliance: 45,
      trade: 10,
      non_aggression: -10,
      peace: -100,
      military_access: 30,
    };
    const bonus = (rel.trust - 50) / 5;
    if (rel.relation + bonus >= threshold[treaty.type]) {
      acceptTreaty(doc, treaty, fx);
    } else {
      treaty.status = "rejected";
      fx.rel(treaty.proposedBy, receiver, "relation", -2, "Proposta respinta");
    }
  }
}

export function acceptTreaty(doc: GameDoc, treaty: Treaty, fx: Fx) {
  treaty.status = "active";
  treaty.signedTurn = doc.turn;
  const [a, b] = treaty.parties;
  const label: Record<Treaty["type"], string> = {
    alliance: "Alleanza",
    trade: "Accordo commerciale",
    non_aggression: "Patto di non aggressione",
    peace: "Trattato di pace",
    military_access: "Accesso militare",
  };
  switch (treaty.type) {
    case "alliance":
      fx.rel(a, b, "relation", 15, "Alleanza firmata");
      fx.rel(a, b, "trust", 10, "Alleanza firmata");
      fx.rel(a, b, "tension", -10, "Alleanza firmata");
      break;
    case "trade":
      fx.rel(a, b, "relation", 8, "Accordo commerciale firmato");
      fx.stat(a, "income", 3, "Nuovo accordo commerciale");
      fx.stat(b, "income", 3, "Nuovo accordo commerciale");
      fx.stat(a, "tradeCapacity", 3, "Nuovo accordo commerciale");
      fx.stat(b, "tradeCapacity", 3, "Nuovo accordo commerciale");
      break;
    case "non_aggression":
      fx.rel(a, b, "tension", -12, "Patto di non aggressione");
      fx.rel(a, b, "trust", 6, "Patto di non aggressione");
      break;
    case "peace": {
      const war = doc.wars.find(
        (w) => w.status !== "ended" && pairKey(w.attacker, w.defender) === pairKey(a, b),
      );
      if (war) {
        war.status = "ended";
        war.endedTurn = doc.turn;
      }
      fx.rel(a, b, "tension", -30, "Pace firmata");
      fx.rel(a, b, "relation", 10, "Pace firmata");
      fx.world(-6, "Un conflitto si chiude con la pace");
      fx.stat(a, "stability", 4, "Fine della guerra");
      fx.stat(b, "stability", 4, "Fine della guerra");
      break;
    }
    case "military_access":
      fx.rel(a, b, "trust", 5, "Accesso militare concesso");
      break;
  }
  doc.worldEvents.push({
    id: `we_${doc.seed}_${doc.worldEvents.length}`,
    turn: doc.turn,
    headline: `${label[treaty.type]} tra ${doc.countries[a]?.name ?? a} e ${doc.countries[b]?.name ?? b}`,
    description: "Le due cancellerie hanno formalizzato l'intesa.",
    affectedCountryIds: [a, b],
    source: "rules",
    at: new Date().toISOString(),
  });
}

/** Per-turn passive world updates. */
function applyPassiveEffects(doc: GameDoc, fx: Fx) {
  for (const country of Object.values(doc.countries)) {
    const isActive = country.control === "player";
    const s = country.stats;
    // Income & debt service.
    const corruptionDrag = s.corruption * 0.1;
    const sanctionsDrag = s.sanctionPressure * 0.15;
    const net = s.income - corruptionDrag - sanctionsDrag - s.debt * 0.05;
    if (isActive) {
      fx.stat(country.id, "treasury", Math.round(net), "Bilancio del turno (reddito − corruzione − sanzioni − interessi)");
    } else {
      s.treasury = Math.max(0, s.treasury + Math.round(net));
    }
    // Corruption slowly erodes legitimacy; low stability erodes support.
    if (isActive && s.corruption > 50) fx.stat(country.id, "legitimacy", -1, "Corruzione diffusa");
    if (isActive && s.stability < 30) fx.stat(country.id, "publicSupport", -2, "Crisi interna in corso");
    // Regional unrest bleeds into stability.
    const avgUnrest = country.regions.length
      ? country.regions.reduce((sum, r) => sum + r.unrest, 0) / country.regions.length
      : 0;
    if (isActive && avgUnrest > 35) fx.stat(country.id, "stability", -2, "Malcontento regionale elevato");
    // Readiness decays slowly toward 30 in peacetime.
    if (!doc.wars.some((w) => w.status === "active" && (w.attacker === country.id || w.defender === country.id))) {
      if (s.militaryReadiness > 30) s.militaryReadiness = Math.max(30, s.militaryReadiness - 1);
    }
  }

  // Wars: exhaustion, costs, score drift.
  for (const war of doc.wars) {
    if (war.status !== "active") continue;
    const att = doc.countries[war.attacker];
    const def = doc.countries[war.defender];
    if (!att || !def) continue;
    const power = (c: typeof att) => c.stats.militaryStrength * (0.5 + c.stats.militaryReadiness / 200);
    const delta = (power(att) - power(def)) / 10;
    war.score = Math.round(Math.max(-100, Math.min(100, war.score + delta)) * 10) / 10;
    for (const side of [war.attacker, war.defender]) {
      war.exhaustion[side] = Math.min(100, (war.exhaustion[side] ?? 0) + 8);
      fx.stat(side, "treasury", -30, "Costi di guerra");
      fx.stat(side, "stability", -3, "Logoramento bellico");
      fx.stat(side, "publicSupport", -2, "Stanchezza per la guerra");
    }
    fx.rel(war.attacker, war.defender, "tension", 4, "Guerra in corso");
    // High exhaustion forces a ceasefire.
    if (Object.values(war.exhaustion).some((e) => e >= 80)) {
      war.status = "ceasefire";
      doc.worldEvents.push({
        id: `we_${doc.seed}_${doc.worldEvents.length}`,
        turn: doc.turn,
        headline: `Il fronte tra ${att.name} e ${def.name} si congela`,
        description: "L'esaurimento bellico impone un cessate il fuoco de facto.",
        affectedCountryIds: [war.attacker, war.defender],
        source: "rules",
        at: new Date().toISOString(),
      });
    }
  }

  // Sanctions: sustained pressure.
  for (const sanction of doc.sanctions) {
    if (!sanction.active) continue;
    fx.stat(sanction.target, "sanctionPressure", 2, `Sanzioni di ${doc.countries[sanction.source]?.name ?? sanction.source}`);
    fx.stat(sanction.target, "treasury", -10, "Pressione delle sanzioni");
    fx.rel(sanction.source, sanction.target, "tension", 1, "Regime di sanzioni in vigore");
  }

  // Active trade agreements & alliances slowly build relations.
  for (const treaty of doc.treaties) {
    if (treaty.status !== "active") continue;
    const [a, b] = treaty.parties;
    if (treaty.type === "trade") fx.rel(a, b, "relation", 1, "Commercio bilaterale attivo");
    if (treaty.type === "alliance") fx.rel(a, b, "trust", 1, "Alleanza consolidata");
  }

  // Tension decays slightly where nothing feeds it; global tension cools.
  for (const rel of Object.values(doc.relations)) {
    if (rel.tension > 0) rel.tension = Math.max(0, Math.round((rel.tension - 1) * 10) / 10);
  }
  fx.world(-1, "Raffreddamento naturale delle crisi");

  // Nuclear posture: standing deterrence effect on global tension.
  const maxPosture = Math.max(0, ...Object.values(doc.countries).map((c) => c.stats.nuclearPosture));
  if (maxPosture >= 60) fx.world(2, "Postura nucleare elevata nel mondo");

  // AI flags tick down.
  doc.flags = doc.flags.filter((f) => {
    f.remainingTurns -= 1;
    return f.remainingTurns > 0;
  });
}

/**
 * Applies validated AI output with hard caps. Signals become small
 * relation/tension changes, flags become short-lived modifiers, events and
 * briefings become narrative content. Nothing else is allowed through.
 */
function applyAIAnalysis(doc: GameDoc, analysis: TurnAIAnalysis, fx: Fx) {
  const pairTotals: Record<string, { rel: number; ten: number }> = {};
  const validId = (id: string) => Boolean(doc.countries[id]);

  for (const signal of analysis.diplomaticSignals.slice(0, AI_MAX_SIGNALS)) {
    if (!validId(signal.sourceCountryId) || !validId(signal.targetCountryId)) continue;
    if (signal.sourceCountryId === signal.targetCountryId) continue;
    const key = pairKey(signal.sourceCountryId, signal.targetCountryId);
    const totals = (pairTotals[key] ??= { rel: 0, ten: 0 });
    const table: Record<string, { rel: number; ten: number }> = {
      friendly: { rel: 1, ten: -0.5 },
      cooperative: { rel: 1, ten: -0.5 },
      conciliatory: { rel: 0.5, ten: -1 },
      neutral: { rel: 0, ten: 0 },
      deceptive: { rel: 0, ten: 0.5 },
      provocative: { rel: -0.5, ten: 1 },
      hostile: { rel: -1, ten: 1 },
      threatening: { rel: -1, ten: 1.5 },
    };
    const base = table[signal.tag] ?? { rel: 0, ten: 0 };
    let relDelta = base.rel * signal.intensity;
    let tenDelta = base.ten * signal.intensity;
    // Clamp cumulative per-pair effect.
    relDelta = Math.max(-AI_MAX_RELATION_DELTA - totals.rel, Math.min(AI_MAX_RELATION_DELTA - totals.rel, relDelta));
    tenDelta = Math.max(-AI_MAX_TENSION_DELTA - totals.ten, Math.min(AI_MAX_TENSION_DELTA - totals.ten, tenDelta));
    totals.rel += relDelta;
    totals.ten += tenDelta;
    const reason = `Segnale diplomatico (${signal.tag}, intensità ${signal.intensity})`;
    fx.rel(signal.sourceCountryId, signal.targetCountryId, "relation", relDelta, reason);
    fx.rel(signal.sourceCountryId, signal.targetCountryId, "tension", tenDelta, reason);
  }

  for (const flag of analysis.suggestedFlags.slice(0, AI_MAX_FLAGS)) {
    if (!validId(flag.countryId)) continue;
    doc.flags.push({
      countryId: flag.countryId,
      flag: flag.flag,
      remainingTurns: Math.min(3, Math.max(1, flag.durationTurns)),
      reason: flag.reason.slice(0, 200),
    });
    // Flags have one small immediate, bounded effect.
    const flagFx: Record<string, () => void> = {
      public_pressure: () => fx.stat(flag.countryId, "publicSupport", -1, "Pressione dell'opinione pubblica"),
      escalation_risk: () => fx.world(1, `Rischio di escalation (${doc.countries[flag.countryId]?.name})`),
      trust_bonus: () => fx.stat(flag.countryId, "influence", 1, "Credibilità diplomatica in crescita"),
      diplomatic_suspicion: () => fx.stat(flag.countryId, "influence", -1, "Sospetti diplomatici"),
      negotiation_momentum: () => fx.stat(flag.countryId, "influence", 1, "Slancio negoziale"),
    };
    flagFx[flag.flag]?.();
  }

  const now = new Date().toISOString();
  for (const event of analysis.publicWorldEvents.slice(0, AI_MAX_EVENTS)) {
    doc.worldEvents.push({
      id: `we_${doc.seed}_${doc.worldEvents.length}`,
      turn: doc.turn,
      headline: event.headline.slice(0, 160),
      description: event.description.slice(0, 500),
      affectedCountryIds: event.affectedCountryIds.filter(validId).slice(0, 8),
      source: "ai",
      at: now,
    } satisfies WorldEvent);
  }
  for (const briefing of analysis.privateBriefings.slice(0, AI_MAX_BRIEFINGS)) {
    if (!validId(briefing.recipientCountryId)) continue;
    doc.briefings.push({
      id: `brief_${doc.seed}_${doc.briefings.length}`,
      turn: doc.turn,
      recipientCountryId: briefing.recipientCountryId,
      title: briefing.title.slice(0, 160),
      content: briefing.content.slice(0, 800),
      severity: briefing.severity,
      source: "ai",
      at: now,
    } satisfies PrivateBriefing);
  }
}

export interface ResolveTurnOptions {
  analysis: TurnAIAnalysis | null;
  aiError: string | null;
}

/**
 * Resolves the current turn in place. The caller must have set
 * doc.resolvingTurn = doc.turn beforehand (idempotency lock) and provides
 * the (already Zod-validated) AI analysis or null.
 */
export function resolveTurn(doc: GameDoc, options: ResolveTurnOptions): TurnResolutionReport {
  const rng = turnRng(doc.seed, doc.turn);
  const fx = new Fx(doc, "rules");

  const actionResults = resolvePendingActions(doc, rng);
  resolveTreatyProposals(doc, fx);
  applyPassiveEffects(doc, fx);

  let aiApplied = false;
  const aiFx = new Fx(doc, "ai");
  if (options.analysis) {
    applyAIAnalysis(doc, options.analysis, aiFx);
    aiApplied = true;
  }

  const report: TurnResolutionReport = {
    turn: doc.turn,
    resolvedAt: new Date().toISOString(),
    actionResults,
    passiveEffects: fx.logs,
    aiApplied,
    aiSignalEffects: aiFx.logs,
    narrativeSummary: options.analysis?.narrativeSummary?.slice(0, 1500) ?? null,
    aiError: options.aiError,
  };
  doc.resolutions.push(report);

  // Advance to the next turn.
  doc.turn += 1;
  doc.turnStartedAt = new Date().toISOString();
  doc.turnEndsAt =
    doc.options.turnDurationMinutes > 0
      ? new Date(Date.now() + doc.options.turnDurationMinutes * 60_000).toISOString()
      : null;
  doc.resolvingTurn = null;
  for (const player of doc.players) player.ready = false;
  for (const country of Object.values(doc.countries)) {
    if (country.control === "player") {
      country.stats.actionPoints = BASE_ACTION_POINTS;
    }
  }
  return report;
}
