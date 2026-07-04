import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/api";
import { audit } from "@/lib/server/gameOps";
import { startGame } from "@/lib/engine/game";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    await getStore().updateGame(gameId, (doc) => {
      if (playerId !== doc.hostId) throw new StoreError("Solo l'host può avviare la partita.", 403);
      if (doc.status !== "lobby") throw new StoreError("La partita è già iniziata.", 400);
      const missing = doc.players.filter((p) => !p.countryId);
      if (missing.length > 0)
        throw new StoreError(
          `Tutti i giocatori devono scegliere un paese (in attesa: ${missing.map((p) => p.name).join(", ")}).`,
          400,
        );
      startGame(doc);
      audit(doc, playerId, "game_started", `Partita avviata con ${doc.players.length} giocatori`);
    });
    return { ok: true };
  });
}
