import { TurnAIAnalysis } from "./schema";
import { TurnInputSummary } from "@/lib/engine/turn";
import { DiplomacyAIResolver } from "./resolver";

/**
 * Deterministic heuristic resolver used when no ANTHROPIC_API_KEY is
 * configured. It performs a shallow tone analysis of diplomatic messages
 * and recent actions so the full turn pipeline (signals → bounded effects
 * → events → briefings) is exercised end-to-end without any API call.
 */

const HOSTILE_WORDS = [
  "guerra", "attacc", "minacc", "ultimatum", "distrugg", "invas", "nemic",
  "conseguenze", "pagherete", "war", "attack", "threat", "destroy", "enemy",
];
const FRIENDLY_WORDS = [
  "alleanza", "amicizia", "cooperazione", "accordo", "pace", "insieme",
  "partner", "aiuto", "grazie", "alliance", "friendship", "peace", "trade",
  "cooperation", "together", "thank",
];
const CONCILIATORY_WORDS = [
  "scuse", "dispiace", "distension", "de-escalation", "dialogo", "capisco",
  "sorry", "apolog", "understand", "dialogue",
];

function tone(body: string): { tag: "hostile" | "friendly" | "conciliatory" | "neutral"; hits: number } {
  const lower = body.toLowerCase();
  const count = (words: string[]) => words.filter((w) => lower.includes(w)).length;
  const hostile = count(HOSTILE_WORDS);
  const friendly = count(FRIENDLY_WORDS);
  const conciliatory = count(CONCILIATORY_WORDS);
  if (hostile > friendly && hostile > conciliatory) return { tag: "hostile", hits: hostile };
  if (conciliatory > friendly && conciliatory > 0) return { tag: "conciliatory", hits: conciliatory };
  if (friendly > 0) return { tag: "friendly", hits: friendly };
  return { tag: "neutral", hits: 0 };
}

const HOSTILE_ACTIONS = new Set([
  "impose_sanctions", "diplomatic_warning", "border_deployment", "mobilization",
  "declare_war", "demand_concession", "break_treaty", "raise_nuclear_posture",
]);
const FRIENDLY_ACTIONS = new Set([
  "offer_aid", "propose_alliance", "propose_trade", "propose_nap",
  "recognize_government", "de_escalate", "lift_sanctions", "propose_peace",
  "lower_nuclear_posture", "offer_ceasefire",
]);

export class MockResolver implements DiplomacyAIResolver {
  readonly name = "mock";

  async resolveTurn(input: TurnInputSummary): Promise<TurnAIAnalysis> {
    const signals: TurnAIAnalysis["diplomaticSignals"] = [];
    const events: TurnAIAnalysis["publicWorldEvents"] = [];
    const briefings: TurnAIAnalysis["privateBriefings"] = [];
    const summaryParts: string[] = [];

    for (const message of input.messages.slice(0, 20)) {
      const { tag, hits } = tone(message.body);
      if (tag === "neutral") continue;
      const intensity = (Math.min(3, Math.max(1, hits)) as 1 | 2 | 3);
      signals.push({
        sourceCountryId: message.fromCountryId,
        targetCountryId: message.toCountryId,
        tag,
        intensity,
        evidenceMessageIds: [message.id],
      });
      if (tag === "hostile") {
        briefings.push({
          recipientCountryId: message.toCountryId,
          title: `Tono ostile da ${message.fromName}`,
          content: `I nostri analisti valutano l'ultima comunicazione di ${message.fromName} come apertamente ostile. Si consiglia prudenza.`,
          severity: "warning",
        });
      }
    }

    for (const action of input.actions.slice(0, 20)) {
      if (!action.targetCountryId) continue;
      if (HOSTILE_ACTIONS.has(action.type)) {
        signals.push({
          sourceCountryId: action.countryId,
          targetCountryId: action.targetCountryId,
          tag: action.type === "declare_war" ? "threatening" : "provocative",
          intensity: action.type === "declare_war" ? 3 : 1,
          evidenceMessageIds: [],
        });
      } else if (FRIENDLY_ACTIONS.has(action.type)) {
        signals.push({
          sourceCountryId: action.countryId,
          targetCountryId: action.targetCountryId,
          tag: "cooperative",
          intensity: 1,
          evidenceMessageIds: [],
        });
      }
    }

    if (input.globalTension >= 60) {
      events.push({
        headline: "I mercati tremano: la tensione globale ai massimi",
        description:
          "Gli osservatori internazionali segnalano un clima da crisi sistemica. Le cancellerie preparano piani di emergenza.",
        affectedCountryIds: [],
      });
      summaryParts.push("La tensione mondiale resta pericolosamente alta.");
    }
    for (const war of input.wars) {
      if (war.status === "active") {
        events.push({
          headline: `Il conflitto ${war.attacker}–${war.defender} continua`,
          description: "Nessuno spiraglio negoziale visibile: i combattimenti proseguono.",
          affectedCountryIds: [],
        });
      }
    }

    const hostileCount = signals.filter((s) => s.tag === "hostile" || s.tag === "threatening").length;
    const friendlyCount = signals.filter((s) => s.tag === "friendly" || s.tag === "cooperative").length;
    if (hostileCount > 0) summaryParts.push(`Rilevati ${hostileCount} segnali ostili nelle comunicazioni del turno.`);
    if (friendlyCount > 0) summaryParts.push(`${friendlyCount} aperture diplomatiche registrate.`);
    if (summaryParts.length === 0) summaryParts.push("Turno diplomaticamente tranquillo: nessun segnale rilevante.");

    return {
      diplomaticSignals: signals.slice(0, 24),
      suggestedFlags:
        hostileCount >= 2
          ? [
              {
                countryId: signals.find((s) => s.tag === "hostile" || s.tag === "threatening")!.targetCountryId,
                flag: "escalation_risk",
                durationTurns: 2,
                reason: "Ripetuti segnali ostili ricevuti nello stesso turno.",
              },
            ]
          : [],
      publicWorldEvents: events.slice(0, 6),
      privateBriefings: briefings.slice(0, 12),
      narrativeSummary: summaryParts.join(" "),
    };
  }
}
