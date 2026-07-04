import { CountryState, CountryRelation, GameDoc, pairKey } from "@/lib/types";
import { MapMode } from "@/lib/client/gameStore";

/**
 * Country fill color per map mode. Colors stay muted and atlas-like;
 * information density lives in overlays and panels, not in saturation.
 */

const BASE = {
  locked: "hsl(220 12% 15%)",
  ai: "hsl(219 20% 21%)",
  available: "hsl(210 34% 33%)",
  me: "hsl(38 55% 45%)",
  otherPlayer: "hsl(268 28% 40%)",
};

function scale(value: number, stops: [string, string, string]): string {
  // 0 → stops[0] (bad), 50 → stops[1], 100 → stops[2] (good)
  if (value <= 25) return stops[0];
  if (value <= 60) return stops[1];
  return stops[2];
}

const RED_TO_GREEN: [string, string, string] = [
  "hsl(0 45% 30%)",
  "hsl(38 40% 32%)",
  "hsl(150 32% 30%)",
];

export interface MapViewData {
  countries: Record<string, CountryState>;
  relations: Record<string, CountryRelation>;
  treaties: GameDoc["treaties"];
  wars: GameDoc["wars"];
  sanctions: GameDoc["sanctions"];
  myCountryId: string | null;
  globalTension: number;
}

export function countryFill(
  id: string,
  mode: MapMode,
  data: MapViewData,
): string {
  const country = data.countries[id];
  if (!country) return BASE.locked;

  if (mode === "politico") {
    if (id === data.myCountryId) return BASE.me;
    if (country.control === "player") return BASE.otherPlayer;
    if (country.control === "available") return BASE.available;
    if (country.control === "ai") return BASE.ai;
    return BASE.locked;
  }

  if (mode === "diplomatico") {
    if (!data.myCountryId) return BASE.ai;
    if (id === data.myCountryId) return BASE.me;
    const rel = data.relations[pairKey(id, data.myCountryId)];
    if (!rel) return BASE.ai;
    return scale(rel.relation / 2 + 50, RED_TO_GREEN);
  }

  if (mode === "stabilita") return scale(country.stats.stability, RED_TO_GREEN);

  if (mode === "economia") {
    const economic = (country.stats.tradeCapacity + Math.min(100, country.stats.income)) / 2;
    return scale(economic, [
      "hsl(220 15% 18%)",
      "hsl(180 25% 26%)",
      "hsl(165 40% 30%)",
    ]);
  }

  if (mode === "militare") {
    return scale(country.stats.militaryStrength, [
      "hsl(220 15% 18%)",
      "hsl(15 35% 28%)",
      "hsl(0 50% 33%)",
    ]);
  }

  if (mode === "alleanze") {
    if (!data.myCountryId) return BASE.ai;
    if (id === data.myCountryId) return BASE.me;
    const key = pairKey(id, data.myCountryId);
    const treaty = data.treaties.find(
      (t) =>
        t.status === "active" &&
        pairKey(t.parties[0], t.parties[1]) === key,
    );
    if (treaty?.type === "alliance") return "hsl(150 40% 32%)";
    if (treaty) return "hsl(180 30% 28%)";
    const atWar = data.wars.some(
      (w) => w.status === "active" && pairKey(w.attacker, w.defender) === key,
    );
    if (atWar) return "hsl(0 55% 32%)";
    return BASE.ai;
  }

  // tensione: highest bilateral tension involving this country.
  let maxTension = 0;
  for (const [key, rel] of Object.entries(data.relations)) {
    if (key.includes(id) && rel.tension > maxTension) maxTension = rel.tension;
  }
  return scale(100 - maxTension, RED_TO_GREEN);
}

export const MODE_LABELS: Record<MapMode, string> = {
  politico: "Politico",
  diplomatico: "Diplomatico",
  stabilita: "Stabilità",
  economia: "Economia",
  militare: "Militare",
  alleanze: "Alleanze",
  tensione: "Tensione mondiale",
};

export const MODE_LEGEND: Record<MapMode, { color: string; label: string }[]> = {
  politico: [
    { color: BASE.me, label: "Il tuo paese" },
    { color: BASE.otherPlayer, label: "Altri giocatori" },
    { color: BASE.available, label: "Disponibile" },
    { color: BASE.ai, label: "Controllato dall'AI" },
    { color: BASE.locked, label: "Non giocabile" },
  ],
  diplomatico: [
    { color: RED_TO_GREEN[2], label: "Relazioni buone" },
    { color: RED_TO_GREEN[1], label: "Neutrali" },
    { color: RED_TO_GREEN[0], label: "Ostili" },
  ],
  stabilita: [
    { color: RED_TO_GREEN[2], label: "Stabile" },
    { color: RED_TO_GREEN[1], label: "Fragile" },
    { color: RED_TO_GREEN[0], label: "In crisi" },
  ],
  economia: [
    { color: "hsl(165 40% 30%)", label: "Economia forte" },
    { color: "hsl(180 25% 26%)", label: "Media" },
    { color: "hsl(220 15% 18%)", label: "Debole" },
  ],
  militare: [
    { color: "hsl(0 50% 33%)", label: "Potenza militare" },
    { color: "hsl(15 35% 28%)", label: "Media" },
    { color: "hsl(220 15% 18%)", label: "Limitata" },
  ],
  alleanze: [
    { color: "hsl(150 40% 32%)", label: "Alleato" },
    { color: "hsl(180 30% 28%)", label: "Altro trattato" },
    { color: "hsl(0 55% 32%)", label: "In guerra con te" },
  ],
  tensione: [
    { color: RED_TO_GREEN[0], label: "Tensione critica" },
    { color: RED_TO_GREEN[1], label: "Moderata" },
    { color: RED_TO_GREEN[2], label: "Calma" },
  ],
};
