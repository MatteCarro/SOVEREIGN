import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/api";
import { buildGameView } from "@/lib/server/view";
import { maybeAutoResolve } from "@/lib/server/gameOps";

export const runtime = "nodejs";

/**
 * Game state polling endpoint. Pass ?since=<version> to receive
 * { unchanged: true } when nothing happened — cheap realtime for all
 * connected players. Also fires timer-based turn resolution lazily.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    let doc = await getStore().getGame(gameId);
    if (!doc) throw new StoreError("Partita non trovata.", 404);

    if (await maybeAutoResolve(doc)) {
      doc = (await getStore().getGame(gameId))!;
    }

    const since = Number(request.nextUrl.searchParams.get("since") ?? "0");
    if (since > 0 && doc.version <= since) {
      return { unchanged: true, version: doc.version };
    }
    return { view: buildGameView(doc, playerId) };
  });
}
