import { NextRequest } from "next/server";
import { requireSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/api";
import { performTurnResolution } from "@/lib/server/gameOps";

export const runtime = "nodejs";

/** Manual turn resolution — host only. Idempotent per turn. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const result = await performTurnResolution(gameId, playerId, "host");
    return { ok: true, resolvedTurn: result.turn };
  });
}
