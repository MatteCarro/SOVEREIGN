import countries from "world-countries";
import {
  CountryState,
  CountryStats,
  CountryRelation,
  pairKey,
} from "@/lib/types";
import { hashString, mulberry32 } from "@/lib/engine/rng";
import { generateLeader } from "./leaders";
import { BASE_ACTION_POINTS, SEED_COUNTRIES, SEED_IDS } from "./seeds";

/**
 * Builds the full world: 8 hand-crafted playable countries plus a
 * procedurally generated (but deterministic per game seed) state for every
 * other ISO country, so the architecture supports playing anywhere.
 *
 * Server-side only — world-countries is a large dataset.
 */

const EXCLUDED = new Set(["ATA"]); // Antarctica

interface RawCountry {
  cca3: string;
  ccn3?: string;
  name: { common: string };
  capital?: string[];
  latlng?: number[];
  area?: number;
  region?: string;
  flag?: string;
  borders?: string[];
}

const RAW: RawCountry[] = (countries as unknown as RawCountry[]).filter(
  (c) => c.cca3 && !EXCLUDED.has(c.cca3),
);

const RAW_BY_ID = new Map(RAW.map((c) => [c.cca3, c]));

/** Map ISO 3166-1 numeric (topojson feature id) -> alpha-3. */
export const NUMERIC_TO_ALPHA3: Record<string, string> = Object.fromEntries(
  RAW.filter((c) => c.ccn3).map((c) => [c.ccn3 as string, c.cca3]),
);

export const ITALIAN_NAMES: Record<string, string> = {
  ITA: "Italia", FRA: "Francia", DEU: "Germania", TUR: "Turchia",
  BRA: "Brasile", IND: "India", JPN: "Giappone", NGA: "Nigeria",
  USA: "Stati Uniti", GBR: "Regno Unito", ESP: "Spagna", CHN: "Cina",
  RUS: "Russia", EGY: "Egitto", GRC: "Grecia", CHE: "Svizzera",
  AUT: "Austria", POL: "Polonia", SWE: "Svezia", NOR: "Norvegia",
  MEX: "Messico", ARG: "Argentina", ZAF: "Sudafrica", SAU: "Arabia Saudita",
  KOR: "Corea del Sud", PRK: "Corea del Nord", UKR: "Ucraina", MAR: "Marocco",
  DZA: "Tunisia e Algeria" ,
};

function displayName(raw: RawCountry): string {
  return ITALIAN_NAMES[raw.cca3] ?? raw.name.common;
}

function proceduralStats(raw: RawCountry, seed: number): Omit<CountryStats, "actionPoints"> {
  const rng = mulberry32((hashString(raw.cca3) ^ seed) >>> 0);
  const size = Math.min(1, Math.log10((raw.area ?? 1000) + 10) / 7);
  const wealthByRegion: Record<string, number> = {
    Europe: 0.75, Americas: 0.55, Asia: 0.55, Oceania: 0.6, Africa: 0.35,
  };
  const wealth = (wealthByRegion[raw.region ?? ""] ?? 0.5) + (rng() - 0.5) * 0.2;
  const v = (base: number, spread: number) =>
    Math.round(Math.min(95, Math.max(5, base + (rng() - 0.5) * spread)));
  return {
    treasury: Math.round(150 + wealth * 500 + size * 200),
    income: Math.round(15 + wealth * 40 + size * 15),
    debt: v(45, 40),
    stability: v(40 + wealth * 35, 25),
    legitimacy: v(45 + wealth * 25, 25),
    influence: v(20 + wealth * 30 + size * 25, 20),
    militaryReadiness: v(35, 30),
    militaryStrength: v(20 + size * 45, 25),
    research: v(20 + wealth * 45, 20),
    publicSupport: v(50, 30),
    corruption: v(65 - wealth * 45, 25),
    tradeCapacity: v(30 + wealth * 40, 20),
    sanctionPressure: 0,
    nuclearPosture: 0,
  };
}

function estimatePopulation(raw: RawCountry, seed: number): number {
  const rng = mulberry32((hashString(raw.cca3 + "pop") ^ seed) >>> 0);
  const area = raw.area ?? 1000;
  return Math.max(1, Math.round(Math.pow(area, 0.62) * (0.4 + rng() * 0.8) / 10));
}

export function buildWorld(gameSeed: number, aiNeutrals: boolean): {
  countries: Record<string, CountryState>;
  relations: Record<string, CountryRelation>;
} {
  const result: Record<string, CountryState> = {};

  for (const raw of RAW) {
    const seed = SEED_COUNTRIES[raw.cca3];
    const isSeed = Boolean(seed);
    const rng = mulberry32((hashString(raw.cca3 + "leader") ^ gameSeed) >>> 0);
    const coords: [number, number] = seed
      ? seed.capitalCoords
      : [raw.latlng?.[1] ?? 0, raw.latlng?.[0] ?? 0];

    result[raw.cca3] = {
      id: raw.cca3,
      name: displayName(raw),
      capital: seed?.capital ?? raw.capital?.[0] ?? "—",
      flag: raw.flag ?? "🏳️",
      population: seed?.population ?? estimatePopulation(raw, gameSeed),
      control: isSeed ? "available" : aiNeutrals ? "ai" : "locked",
      playerId: null,
      leader: seed?.leader ?? generateLeader(rng),
      stats: {
        ...(seed?.stats ?? proceduralStats(raw, gameSeed)),
        actionPoints: BASE_ACTION_POINTS,
      },
      regions: seed?.regions ?? [],
      politicalTraits: seed?.politicalTraits ?? [],
      capitalCoords: coords,
    };
  }

  // Starting relations: seed matrix + neighbor baseline.
  const relations: Record<string, CountryRelation> = {};
  for (const id of SEED_IDS) {
    const seed = SEED_COUNTRIES[id];
    for (const [other, rel] of Object.entries(seed.relations)) {
      relations[pairKey(id, other)] = { ...rel };
    }
  }
  // Neighbors of seed countries get a mild baseline so the map isn't empty.
  for (const id of SEED_IDS) {
    const raw = RAW_BY_ID.get(id);
    for (const border of raw?.borders ?? []) {
      const key = pairKey(id, border);
      if (!relations[key] && result[border]) {
        relations[key] = { relation: 10, tension: 10, trust: 50 };
      }
    }
  }
  return { countries: result, relations };
}

export function neighborsOf(countryId: string): string[] {
  return RAW_BY_ID.get(countryId)?.borders ?? [];
}
