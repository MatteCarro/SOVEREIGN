import "server-only";
import { GameDoc } from "@/lib/types";
import { getStore, StoreError } from "./store";
import { buildTurnSummary, resolveTurn, TurnInputSummary } from "@/lib/engine/turn";
import { getResolver } from "@/lib/ai/resolver";
import { TurnAIAnalysis, TurnAIAnalysisSchema } from "@/lib/ai/schema";

export function audit(doc: GameDoc, actorPlayerId: string | null, type: string, detail: string) {
  doc.auditLog.push({
    id: `audit_${doc.auditLog.length}_${Date.now()}`,
    at: new Date().toISOString(),
    actorPlayerId,
    type,
    detail,
  });
  if (doc.auditLog.length > 500) doc.auditLog.splice(0, doc.auditLog.length - 500);
}

const RESOLVE_LOCK_STALE_MS = 90_000;

export type ResolveTrigger = "host" | "timer" | "all_ready";

/**
 * Full turn resolution flow with idempotency:
 *  phase 1 — acquire the per-turn lock inside an atomic update;
 *  phase 2 — AI analysis outside the lock (can be slow);
 *  phase 3 — validate/clamp AI output and apply everything atomically.
 * A turn can never resolve twice: phase 3 re-checks the turn number.
 */
export async function performTurnResolution(
  gameId: string,
  initiatorPlayerId: string | null,
  trigger: ResolveTrigger,
): Promise<{ turn: number }> {
  const store = getStore();

  // Phase 1 — lock and snapshot.
  const summary: TurnInputSummary = await store.updateGame(gameId, (doc) => {
    if (doc.status !== "active") throw new StoreError("La partita non è attiva.", 400);
    if (trigger === "host" && initiatorPlayerId !== doc.hostId)
      throw new StoreError("Solo l'host può risolvere il turno manualmente.", 403);
    if (trigger === "timer") {
      if (!doc.turnEndsAt || new Date(doc.turnEndsAt).getTime() > Date.now())
        throw new StoreError("Il turno non è ancora scaduto.", 400);
    }
    if (doc.resolvingTurn === doc.turn) {
      const since = doc.resolvingSince ? Date.parse(doc.resolvingSince) : 0;
      if (Date.now() - since < RESOLVE_LOCK_STALE_MS)
        throw new StoreError("Risoluzione del turno già in corso.", 409);
      // Stale lock (previous attempt crashed): take over.
    }
    doc.resolvingTurn = doc.turn;
    doc.resolvingSince = new Date().toISOString();
    audit(doc, initiatorPlayerId, "resolve_start", `Turno ${doc.turn} in risoluzione (${trigger})`);
    return buildTurnSummary(doc);
  });

  // Phase 2 — AI analysis (outside the store lock).
  let analysis: TurnAIAnalysis | null = null;
  let aiError: string | null = null;
  const doc = await store.getGame(gameId);
  if (doc?.options.aiDiplomacy) {
    try {
      const resolver = await getResolver();
      const raw = await resolver.resolveTurn(summary);
      analysis = TurnAIAnalysisSchema.parse(raw);
    } catch (error) {
      // AI failure never blocks the game: fall back to deterministic-only.
      aiError = error instanceof Error ? error.message : String(error);
      console.error(`[sovereign] AI resolver failed for game ${gameId} turn ${summary.turn}:`, aiError);
      analysis = null;
    }
  }

  // Phase 3 — apply atomically, guarding against double resolution.
  return store.updateGame(gameId, (doc) => {
    if (doc.turn !== summary.turn) throw new StoreError("Turno già risolto.", 409);
    const report = resolveTurn(doc, { analysis, aiError });
    doc.resolvingSince = null;
    audit(
      doc,
      initiatorPlayerId,
      "resolve_done",
      `Turno ${report.turn} risolto: ${report.actionResults.length} azioni, AI=${report.aiApplied ? "sì" : "no"}${aiError ? ` (errore AI: ${aiError.slice(0, 120)})` : ""}`,
    );
    return { turn: report.turn };
  });
}

/** Lazily fires timer-based resolution when a client polls an expired turn. */
export async function maybeAutoResolve(doc: GameDoc): Promise<boolean> {
  if (
    doc.status === "active" &&
    doc.turnEndsAt &&
    new Date(doc.turnEndsAt).getTime() <= Date.now() &&
    doc.resolvingTurn === null
  ) {
    try {
      await performTurnResolution(doc.id, null, "timer");
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
