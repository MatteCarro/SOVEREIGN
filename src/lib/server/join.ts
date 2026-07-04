import "server-only";
import { GameDoc } from "@/lib/types";
import { StoreError } from "./store";
import { audit } from "./gameOps";

export function joinGame(doc: GameDoc, playerId: string, playerName: string) {
  if (doc.status === "ended") throw new StoreError("La partita è terminata.", 400);
  if (doc.players.some((p) => p.id === playerId)) return; // already in
  if (doc.players.length >= doc.options.maxPlayers)
    throw new StoreError("La partita è piena.", 400);
  doc.players.push({
    id: playerId,
    name: playerName,
    countryId: null,
    isHost: false,
    ready: false,
    joinedAt: new Date().toISOString(),
  });
  audit(doc, playerId, "player_joined", `${playerName} è entrato in partita`);
}
