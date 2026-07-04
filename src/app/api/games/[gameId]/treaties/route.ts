import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, TreatyResponseSchema } from "@/lib/server/api";
import { audit } from "@/lib/server/gameOps";
import { acceptTreaty } from "@/lib/engine/turn";
import { Fx } from "@/lib/engine/effects";

export const runtime = "nodejs";

/** Accept or reject a treaty proposed to your country. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const { treatyId, accept } = TreatyResponseSchema.parse(await request.json());
    await getStore().updateGame(gameId, (doc) => {
      if (doc.status !== "active") throw new StoreError("La partita non è attiva.", 400);
      const player = doc.players.find((p) => p.id === playerId);
      if (!player?.countryId) throw new StoreError("Non controlli alcun paese.", 403);
      const treaty = doc.treaties.find((t) => t.id === treatyId);
      if (!treaty || treaty.status !== "proposed")
        throw new StoreError("Proposta non trovata o già decisa.", 404);
      const receiver = treaty.parties.find((p) => p !== treaty.proposedBy);
      if (receiver !== player.countryId)
        throw new StoreError("Questa proposta non è indirizzata al tuo paese.", 403);
      const fx = new Fx(doc, "rules");
      if (accept) {
        acceptTreaty(doc, treaty, fx);
        audit(doc, playerId, "treaty_accepted", `${treaty.type} firmato (${treaty.parties.join(" – ")})`);
      } else {
        treaty.status = "rejected";
        fx.rel(treaty.parties[0], treaty.parties[1], "relation", -2, "Proposta respinta");
        audit(doc, playerId, "treaty_rejected", `${treaty.type} respinto (${treaty.parties.join(" – ")})`);
      }
    });
    return { ok: true };
  });
}
