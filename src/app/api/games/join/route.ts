import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, JoinSchema } from "@/lib/server/api";
import { joinGame } from "@/lib/server/join";

export const runtime = "nodejs";

/** Join by invite code (finds the game) — body: { code, playerName }. */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const playerId = await requireSession();
    const body = JoinSchema.parse(await request.json());
    if (!body.code) throw new StoreError("Codice invito mancante.", 400);
    const found = await getStore().findByInvite(body.code);
    if (!found) throw new StoreError("Nessuna partita trovata con questo codice.", 404);
    await getStore().updateGame(found.id, (doc) => {
      joinGame(doc, playerId, body.playerName);
    });
    return { gameId: found.id };
  });
}
