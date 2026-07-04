import { NextRequest } from "next/server";
import { getStore } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, JoinSchema } from "@/lib/server/api";
import { joinGame } from "@/lib/server/join";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const body = JoinSchema.parse(await request.json());
    await getStore().updateGame(gameId, (doc) => {
      joinGame(doc, playerId, body.playerName);
    });
    return { gameId };
  });
}
