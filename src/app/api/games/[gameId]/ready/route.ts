import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, ReadySchema } from "@/lib/server/api";
import { audit, performTurnResolution } from "@/lib/server/gameOps";

export const runtime = "nodejs";

/**
 * "Conferma azioni": locks the player's turn. When every player has
 * confirmed, the turn resolves automatically.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const { ready } = ReadySchema.parse(await request.json());
    const allReady = await getStore().updateGame(gameId, (doc) => {
      if (doc.status !== "active") throw new StoreError("La partita non è attiva.", 400);
      const player = doc.players.find((p) => p.id === playerId);
      if (!player?.countryId) throw new StoreError("Non controlli alcun paese.", 403);
      player.ready = ready;
      audit(doc, playerId, "ready", ready ? "Azioni confermate" : "Conferma ritirata");
      const withCountry = doc.players.filter((p) => p.countryId);
      return ready && withCountry.length > 0 && withCountry.every((p) => p.ready);
    });
    if (allReady) {
      try {
        await performTurnResolution(gameId, playerId, "all_ready");
      } catch {
        // Already resolving elsewhere — fine.
      }
    }
    return { ok: true, resolved: allReady };
  });
}
