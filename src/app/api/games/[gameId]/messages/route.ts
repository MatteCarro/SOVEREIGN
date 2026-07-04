import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, MessageSchema } from "@/lib/server/api";
import { audit } from "@/lib/server/gameOps";
import { ACTIONS } from "@/lib/engine/actions";
import { pairKey } from "@/lib/types";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

/**
 * Diplomatic chat. Sending a message costs 1 AP (the "send_message"
 * action): it is delivered immediately and analyzed by the AI at turn end.
 * Message bodies are untrusted content — stored verbatim, never executed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const body = MessageSchema.parse(await request.json());
    const def = ACTIONS.send_message;
    await getStore().updateGame(gameId, (doc) => {
      if (doc.status !== "active") throw new StoreError("La partita non è attiva.", 400);
      const player = doc.players.find((p) => p.id === playerId);
      if (!player?.countryId) throw new StoreError("Non controlli alcun paese.", 403);
      const from = doc.countries[player.countryId];
      const to = doc.countries[body.toCountryId];
      if (!to) throw new StoreError("Paese destinatario non trovato.", 404);
      if (to.id === from.id) throw new StoreError("Non puoi scrivere a te stesso.", 400);
      if (from.stats.actionPoints < def.apCost)
        throw new StoreError("Punti azione insufficienti per inviare un messaggio.", 400);

      from.stats.actionPoints -= def.apCost;
      const threadKey = pairKey(from.id, to.id);
      let thread = doc.threads.find((t) => pairKey(t.participants[0], t.participants[1]) === threadKey);
      if (!thread) {
        thread = {
          id: `thread_${threadKey}`,
          participants: [from.id, to.id].sort() as [string, string],
          lastMessageAt: new Date().toISOString(),
        };
        doc.threads.push(thread);
      }
      thread.lastMessageAt = new Date().toISOString();
      const messageId = `msg_${randomBytes(6).toString("hex")}`;
      doc.messages.push({
        id: messageId,
        threadId: thread.id,
        fromCountryId: from.id,
        toCountryId: to.id,
        senderPlayerId: playerId,
        body: body.body,
        turn: doc.turn,
        at: new Date().toISOString(),
      });
      doc.actions.push({
        id: `act_${randomBytes(6).toString("hex")}`,
        playerId,
        countryId: from.id,
        type: "send_message",
        targetCountryId: to.id,
        payload: { messageId },
        turn: doc.turn,
        submittedAt: new Date().toISOString(),
        apCost: def.apCost,
        status: "pending",
        rejectReason: null,
      });
      audit(doc, playerId, "message_sent", `${from.name} → ${to.name}`);
    });
    return { ok: true };
  });
}
