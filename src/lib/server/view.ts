import "server-only";
import { GameDoc, TurnResolutionReport } from "@/lib/types";
import { ACTIONS } from "@/lib/engine/actions";
import { resolverStatus } from "@/lib/ai/resolver";
import type { GameView } from "@/lib/view";

/**
 * Per-player projection of the game document. Security boundary: private
 * briefings, foreign intelligence operations and other countries' chats
 * never leave the server.
 */
export type { GameView };

/** Hide other countries' undiscovered intelligence details in turn reports. */
function sanitizeReport(report: TurnResolutionReport, myCountryId: string | null, doc: GameDoc): TurnResolutionReport {
  return {
    ...report,
    actionResults: report.actionResults
      .filter((r) => {
        if (r.countryId === myCountryId) return true;
        const def = ACTIONS[r.actionType];
        if (!def) return false;
        if (def.category !== "intelligence") return true;
        // Foreign intel ops are visible only if discovered.
        const op = doc.intelOps.find(
          (o) => o.turn === report.turn && o.source === r.countryId && o.type === r.actionType,
        );
        return Boolean(op?.discovered);
      })
      .map((r) => {
        if (r.countryId === myCountryId) return r;
        const def = ACTIONS[r.actionType];
        if (def?.category === "intelligence") {
          return { ...r, lines: ["Operazione di intelligence attribuita pubblicamente."] };
        }
        return r;
      }),
  };
}

export function buildGameView(doc: GameDoc, playerId: string): GameView {
  const me = doc.players.find((p) => p.id === playerId);
  const myCountryId = me?.countryId ?? null;

  return {
    id: doc.id,
    name: doc.name,
    inviteCode: doc.inviteCode,
    status: doc.status,
    options: doc.options,
    createdAt: doc.createdAt,
    hostId: doc.hostId,
    turn: doc.turn,
    turnStartedAt: doc.turnStartedAt,
    turnEndsAt: doc.turnEndsAt,
    resolvingTurn: doc.resolvingTurn,
    players: doc.players,
    countries: doc.countries,
    relations: doc.relations,
    globalTension: doc.globalTension,
    treaties: doc.treaties,
    wars: doc.wars,
    sanctions: doc.sanctions,
    threads: doc.threads.filter((t) => myCountryId !== null && t.participants.includes(myCountryId)),
    worldEvents: doc.worldEvents.slice(-80),
    flags: doc.flags,
    cooldowns: Object.fromEntries(
      Object.entries(doc.cooldowns).filter(([key]) => myCountryId && key.startsWith(`${myCountryId}|`)),
    ),
    auditLog: [],
    version: doc.version,
    // Private projections:
    myPlayerId: playerId,
    myCountryId,
    briefings: doc.briefings.filter((b) => b.recipientCountryId === myCountryId).slice(-60),
    intelOps: doc.intelOps.filter(
      (o) => o.source === myCountryId || (o.discovered && o.target === myCountryId),
    ),
    messages:
      myCountryId === null
        ? []
        : doc.messages
            .filter((m) => m.fromCountryId === myCountryId || m.toCountryId === myCountryId)
            .slice(-300),
    myPendingActions: doc.actions.filter(
      (a) => a.countryId === myCountryId && a.turn === doc.turn && a.status === "pending",
    ),
    resolutions: doc.resolutions.slice(-12).map((r) => sanitizeReport(r, myCountryId, doc)),
    resolver: resolverStatus(),
    serverNow: new Date().toISOString(),
  };
}
