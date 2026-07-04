import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { getStore } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, CreateGameSchema } from "@/lib/server/api";
import { createGame } from "@/lib/engine/game";
import { audit } from "@/lib/server/gameOps";
import { resolverStatus } from "@/lib/ai/resolver";

export const runtime = "nodejs";

export async function GET() {
  return handle(async () => {
    const games = await getStore().listPublicGames();
    return { games, resolver: resolverStatus() };
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const playerId = await requireSession();
    const body = CreateGameSchema.parse(await request.json());
    const id = randomBytes(8).toString("hex");
    const doc = createGame({
      id,
      name: body.name,
      host: { id: playerId, name: body.playerName },
      options: body.options,
    });
    audit(doc, playerId, "game_created", `Partita "${body.name}" creata da ${body.playerName}`);
    await getStore().createGame(doc);
    return { gameId: id, inviteCode: doc.inviteCode };
  });
}
