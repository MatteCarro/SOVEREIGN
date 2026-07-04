import { GameDoc, GameOptions, GamePlayer } from "@/lib/types";
import { buildWorld } from "@/lib/countries/registry";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(rng: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

export function createGame(params: {
  id: string;
  name: string;
  host: { id: string; name: string };
  options: GameOptions;
  seed?: number;
}): GameDoc {
  const seed = params.seed ?? Math.floor(Math.random() * 2 ** 31);
  const { countries, relations } = buildWorld(seed, params.options.aiNeutrals);
  const host: GamePlayer = {
    id: params.host.id,
    name: params.host.name,
    countryId: null,
    isHost: true,
    ready: false,
    joinedAt: new Date().toISOString(),
  };
  return {
    id: params.id,
    name: params.name,
    inviteCode: generateInviteCode(),
    status: "lobby",
    options: params.options,
    createdAt: new Date().toISOString(),
    hostId: host.id,
    turn: 1,
    turnStartedAt: null,
    turnEndsAt: null,
    resolvingTurn: null,
    players: [host],
    countries,
    relations,
    globalTension: 18,
    treaties: [],
    wars: [],
    sanctions: [],
    intelOps: [],
    threads: [],
    messages: [],
    actions: [],
    resolutions: [],
    worldEvents: [
      {
        id: "we_genesis",
        turn: 0,
        headline: "Un nuovo ordine mondiale prende forma",
        description:
          "In un mondo alternativo ma familiare, nuovi leader salgono al potere. Ogni mossa sarà osservata.",
        affectedCountryIds: [],
        source: "rules",
        at: new Date().toISOString(),
      },
    ],
    briefings: [],
    flags: [],
    cooldowns: {},
    auditLog: [],
    version: 1,
    seed,
  };
}

export function startGame(doc: GameDoc) {
  doc.status = "active";
  doc.turnStartedAt = new Date().toISOString();
  doc.turnEndsAt =
    doc.options.turnDurationMinutes > 0
      ? new Date(Date.now() + doc.options.turnDurationMinutes * 60_000).toISOString()
      : null;
}
