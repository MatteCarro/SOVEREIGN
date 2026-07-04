import { NextRequest } from "next/server";
import { getStore, StoreError } from "@/lib/server/store";
import { requireSession } from "@/lib/server/auth";
import { handle, SelectCountrySchema } from "@/lib/server/api";
import { audit } from "@/lib/server/gameOps";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  return handle(async () => {
    const playerId = await requireSession();
    const { gameId } = await params;
    const { countryId } = SelectCountrySchema.parse(await request.json());
    await getStore().updateGame(gameId, (doc) => {
      const player = doc.players.find((p) => p.id === playerId);
      if (!player) throw new StoreError("Non fai parte di questa partita.", 403);
      if (doc.status !== "lobby")
        throw new StoreError("La scelta del paese è possibile solo in lobby.", 400);
      const country = doc.countries[countryId];
      if (!country) throw new StoreError("Paese non trovato.", 404);
      if (country.control !== "available")
        throw new StoreError(
          country.control === "player"
            ? "Questo paese è già controllato da un altro giocatore."
            : "Questo paese non è selezionabile in questo scenario.",
          400,
        );
      // Release the previously selected country, if any.
      if (player.countryId && doc.countries[player.countryId]) {
        doc.countries[player.countryId].control = "available";
        doc.countries[player.countryId].playerId = null;
      }
      country.control = "player";
      country.playerId = playerId;
      player.countryId = countryId;
      audit(doc, playerId, "country_selected", `${player.name} guida ora ${country.name}`);
    });
    return { ok: true };
  });
}
