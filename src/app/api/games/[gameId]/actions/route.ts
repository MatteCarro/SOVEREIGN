import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, SubmitActionSchema } from "@/lib/server/api";
import { audit } from "@/lib/server/gameOps";
import { ACTIONS, validateAction } from "@/lib/engine/actions";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

/**
 * Action submission. Ownership is enforced server-side: the session's
 * player can only act through the country assigned to them. AP and
 * treasury costs are escrowed immediately; failed prerequisites at
 * resolution time refund them.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const body = SubmitActionSchema.parse(await request.json());
    const actionId = `act_${randomBytes(6).toString("hex")}`;
    await getStore().updateGame(gameId, (doc) => {
      if (doc.status !== "active") throw new StoreError("La partita non è attiva.", 400);
      const player = doc.players.find((p) => p.id === playerId);
      if (!player?.countryId) throw new StoreError("Non controlli alcun paese in questa partita.", 403);
      if (player.ready) throw new StoreError("Hai già confermato le azioni per questo turno.", 400);
      const def = ACTIONS[body.type];
      if (!def) throw new StoreError("Azione sconosciuta.", 400);
      if (def.id === "send_message")
        throw new StoreError("I messaggi diplomatici si inviano dalla chat.", 400);
      const error = validateAction(
        doc,
        player.countryId,
        body.type,
        body.targetCountryId ?? null,
        body.payload ?? null,
      );
      if (error) throw new StoreError(error, 400);
      const country = doc.countries[player.countryId];
      country.stats.actionPoints -= def.apCost;
      if (def.treasuryCost) country.stats.treasury -= def.treasuryCost;
      doc.actions.push({
        id: actionId,
        playerId,
        countryId: player.countryId,
        type: body.type,
        targetCountryId: body.targetCountryId ?? null,
        payload: body.payload ?? null,
        turn: doc.turn,
        submittedAt: new Date().toISOString(),
        apCost: def.apCost,
        status: "pending",
        rejectReason: null,
      });
      audit(doc, playerId, "action_submitted", `${country.name}: ${def.name}${body.targetCountryId ? ` → ${body.targetCountryId}` : ""}`);
    });
    return { actionId };
  });
}

/** Cancel a pending action of the current turn — body: { actionId }. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const { actionId } = (await request.json()) as { actionId?: string };
    if (!actionId) throw new StoreError("actionId mancante.", 400);
    await getStore().updateGame(gameId, (doc) => {
      const player = doc.players.find((p) => p.id === playerId);
      if (!player?.countryId) throw new StoreError("Non controlli alcun paese.", 403);
      if (player.ready) throw new StoreError("Azioni già confermate per questo turno.", 400);
      const index = doc.actions.findIndex(
        (a) =>
          a.id === actionId &&
          a.playerId === playerId &&
          a.turn === doc.turn &&
          a.status === "pending",
      );
      if (index === -1) throw new StoreError("Azione non trovata o non annullabile.", 404);
      const action = doc.actions[index];
      const def = ACTIONS[action.type];
      const country = doc.countries[action.countryId];
      country.stats.actionPoints = Math.min(12, country.stats.actionPoints + action.apCost);
      if (def?.treasuryCost) country.stats.treasury += def.treasuryCost;
      doc.actions.splice(index, 1);
      audit(doc, playerId, "action_cancelled", `${country.name}: ${def?.name ?? action.type} annullata`);
    });
    return { ok: true };
  });
}
