import { CountryLeader, CountryRegion, CountryStats } from "@/lib/types";

/**
 * Hand-crafted playable countries for the launch scenario.
 * Leaders are entirely fictional — this is an alternate-modern world.
 */

export interface SeedCountry {
  id: string;
  capital: string;
  capitalCoords: [number, number]; // [lon, lat]
  population: number; // millions
  leader: CountryLeader;
  stats: Omit<CountryStats, "actionPoints">;
  regions: CountryRegion[];
  politicalTraits: string[];
  /** Starting relation adjustments vs other seed countries. */
  relations: Record<string, { relation: number; tension: number; trust: number }>;
}

export const BASE_ACTION_POINTS = 6;

export const SEED_COUNTRIES: Record<string, SeedCountry> = {
  ITA: {
    id: "ITA",
    capital: "Roma",
    capitalCoords: [12.4964, 41.9028],
    population: 59,
    leader: {
      name: "Vittoria Ansaldi",
      title: "Presidente del Consiglio",
      age: 54,
      ideology: "Centrismo pragmatico",
      traits: ["Diplomatico", "Pragmatico"],
      popularity: 58,
      ambition: "Fare dell'Italia il mediatore del Mediterraneo",
      weakness: "Coalizione parlamentare fragile",
    },
    stats: {
      treasury: 500, income: 42, debt: 65, stability: 62, legitimacy: 68,
      influence: 62, militaryReadiness: 40, militaryStrength: 52, research: 58,
      publicSupport: 56, corruption: 38, tradeCapacity: 68, sanctionPressure: 0,
      nuclearPosture: 0,
    },
    regions: [
      { id: "ITA-N", name: "Nord industriale", population: 27, development: 82, unrest: 12 },
      { id: "ITA-C", name: "Centro", population: 12, development: 74, unrest: 15 },
      { id: "ITA-S", name: "Mezzogiorno", population: 20, development: 58, unrest: 28 },
    ],
    politicalTraits: ["Potenza mediterranea", "Economia manifatturiera"],
    relations: {
      FRA: { relation: 35, tension: 8, trust: 60 },
      DEU: { relation: 40, tension: 5, trust: 65 },
      TUR: { relation: 5, tension: 22, trust: 40 },
    },
  },
  FRA: {
    id: "FRA",
    capital: "Parigi",
    capitalCoords: [2.3522, 48.8566],
    population: 68,
    leader: {
      name: "Édouard Roussel",
      title: "Presidente",
      age: 49,
      ideology: "Liberalismo tecnocratico",
      traits: ["Carismatico", "Tecnocrate"],
      popularity: 51,
      ambition: "Guidare l'autonomia strategica europea",
      weakness: "Proteste sociali ricorrenti",
    },
    stats: {
      treasury: 620, income: 50, debt: 58, stability: 58, legitimacy: 66,
      influence: 74, militaryReadiness: 55, militaryStrength: 68, research: 70,
      publicSupport: 48, corruption: 28, tradeCapacity: 70, sanctionPressure: 0,
      nuclearPosture: 40,
    },
    regions: [
      { id: "FRA-IDF", name: "Île-de-France", population: 12, development: 88, unrest: 22 },
      { id: "FRA-N", name: "Nord e Est", population: 22, development: 70, unrest: 18 },
      { id: "FRA-S", name: "Sud", population: 34, development: 72, unrest: 14 },
    ],
    politicalTraits: ["Deterrenza nucleare", "Seggio permanente ONU"],
    relations: {
      ITA: { relation: 35, tension: 8, trust: 60 },
      DEU: { relation: 45, tension: 6, trust: 68 },
      TUR: { relation: -10, tension: 30, trust: 32 },
    },
  },
  DEU: {
    id: "DEU",
    capital: "Berlino",
    capitalCoords: [13.405, 52.52],
    population: 84,
    leader: {
      name: "Friedrich Hallmann",
      title: "Cancelliere",
      age: 61,
      ideology: "Riformismo istituzionale",
      traits: ["Pragmatico", "Tecnocrate"],
      popularity: 55,
      ambition: "Riconvertire l'industria e blindare l'export",
      weakness: "Dipendenza energetica dall'estero",
    },
    stats: {
      treasury: 780, income: 62, debt: 40, stability: 70, legitimacy: 74,
      influence: 70, militaryReadiness: 35, militaryStrength: 55, research: 76,
      publicSupport: 57, corruption: 20, tradeCapacity: 82, sanctionPressure: 0,
      nuclearPosture: 0,
    },
    regions: [
      { id: "DEU-W", name: "Ovest renano", population: 30, development: 84, unrest: 10 },
      { id: "DEU-S", name: "Sud bavarese", population: 25, development: 86, unrest: 8 },
      { id: "DEU-E", name: "Est", population: 29, development: 66, unrest: 20 },
    ],
    politicalTraits: ["Gigante dell'export", "Cultura della stabilità"],
    relations: {
      ITA: { relation: 40, tension: 5, trust: 65 },
      FRA: { relation: 45, tension: 6, trust: 68 },
    },
  },
  TUR: {
    id: "TUR",
    capital: "Ankara",
    capitalCoords: [32.8597, 39.9334],
    population: 85,
    leader: {
      name: "Kerem Aydoğan",
      title: "Presidente",
      age: 58,
      ideology: "Nazionalismo sviluppista",
      traits: ["Nazionalista", "Imprevedibile"],
      popularity: 60,
      ambition: "Rendere il paese l'arbitro tra due continenti",
      weakness: "Inflazione cronica",
    },
    stats: {
      treasury: 380, income: 38, debt: 52, stability: 52, legitimacy: 58,
      influence: 58, militaryReadiness: 68, militaryStrength: 66, research: 48,
      publicSupport: 60, corruption: 52, tradeCapacity: 56, sanctionPressure: 0,
      nuclearPosture: 0,
    },
    regions: [
      { id: "TUR-W", name: "Ovest anatolico", population: 35, development: 70, unrest: 18 },
      { id: "TUR-C", name: "Anatolia centrale", population: 28, development: 58, unrest: 22 },
      { id: "TUR-E", name: "Est", population: 22, development: 44, unrest: 38 },
    ],
    politicalTraits: ["Cerniera geopolitica", "Esercito influente"],
    relations: {
      FRA: { relation: -10, tension: 30, trust: 32 },
      ITA: { relation: 5, tension: 22, trust: 40 },
    },
  },
  BRA: {
    id: "BRA",
    capital: "Brasilia",
    capitalCoords: [-47.8825, -15.7942],
    population: 214,
    leader: {
      name: "Helena Vasconcelos",
      title: "Presidente",
      age: 52,
      ideology: "Socialdemocrazia",
      traits: ["Carismatico", "Riformista"],
      popularity: 63,
      ambition: "Trasformare il paese nella voce del Sud globale",
      weakness: "Congresso frammentato e ostile",
    },
    stats: {
      treasury: 460, income: 44, debt: 48, stability: 55, legitimacy: 62,
      influence: 56, militaryReadiness: 32, militaryStrength: 48, research: 46,
      publicSupport: 61, corruption: 55, tradeCapacity: 62, sanctionPressure: 0,
      nuclearPosture: 0,
    },
    regions: [
      { id: "BRA-SE", name: "Sud-est", population: 89, development: 72, unrest: 20 },
      { id: "BRA-NE", name: "Nord-est", population: 57, development: 52, unrest: 30 },
      { id: "BRA-AM", name: "Amazzonia", population: 28, development: 40, unrest: 25 },
    ],
    politicalTraits: ["Superpotenza agricola", "Leadership regionale"],
    relations: {},
  },
  IND: {
    id: "IND",
    capital: "Nuova Delhi",
    capitalCoords: [77.209, 28.6139],
    population: 1420,
    leader: {
      name: "Arvind Rathore",
      title: "Primo Ministro",
      age: 66,
      ideology: "Nazionalismo sviluppista",
      traits: ["Nazionalista", "Carismatico"],
      popularity: 68,
      ambition: "Fare del paese la terza economia mondiale",
      weakness: "Tensioni religiose interne",
    },
    stats: {
      treasury: 560, income: 55, debt: 42, stability: 58, legitimacy: 64,
      influence: 66, militaryReadiness: 60, militaryStrength: 72, research: 60,
      publicSupport: 65, corruption: 48, tradeCapacity: 60, sanctionPressure: 0,
      nuclearPosture: 45,
    },
    regions: [
      { id: "IND-N", name: "Nord", population: 500, development: 52, unrest: 26 },
      { id: "IND-S", name: "Sud tecnologico", population: 420, development: 66, unrest: 14 },
      { id: "IND-E", name: "Est", population: 500, development: 44, unrest: 30 },
    ],
    politicalTraits: ["Potenza demografica", "Deterrenza nucleare"],
    relations: {},
  },
  JPN: {
    id: "JPN",
    capital: "Tokyo",
    capitalCoords: [139.6917, 35.6895],
    population: 125,
    leader: {
      name: "Sato Kenjiro",
      title: "Primo Ministro",
      age: 63,
      ideology: "Conservatorismo nazionale",
      traits: ["Tecnocrate", "Pragmatico"],
      popularity: 49,
      ambition: "Riarmare senza spaventare i vicini",
      weakness: "Declino demografico",
    },
    stats: {
      treasury: 720, income: 58, debt: 78, stability: 76, legitimacy: 72,
      influence: 64, militaryReadiness: 45, militaryStrength: 58, research: 80,
      publicSupport: 52, corruption: 18, tradeCapacity: 76, sanctionPressure: 0,
      nuclearPosture: 0,
    },
    regions: [
      { id: "JPN-KAN", name: "Kantō", population: 43, development: 90, unrest: 6 },
      { id: "JPN-KIN", name: "Kansai", population: 22, development: 82, unrest: 8 },
      { id: "JPN-ALT", name: "Regioni periferiche", population: 60, development: 68, unrest: 12 },
    ],
    politicalTraits: ["Gigante tecnologico", "Costituzione pacifista"],
    relations: {},
  },
  NGA: {
    id: "NGA",
    capital: "Abuja",
    capitalCoords: [7.4951, 9.0579],
    population: 218,
    leader: {
      name: "Chidi Okafor",
      title: "Presidente",
      age: 57,
      ideology: "Populismo economico",
      traits: ["Populista", "Corrotto"],
      popularity: 54,
      ambition: "Trasformare il petrolio in potere industriale",
      weakness: "Insurrezioni regionali",
    },
    stats: {
      treasury: 320, income: 36, debt: 38, stability: 42, legitimacy: 48,
      influence: 44, militaryReadiness: 45, militaryStrength: 44, research: 32,
      publicSupport: 50, corruption: 68, tradeCapacity: 48, sanctionPressure: 0,
      nuclearPosture: 0,
    },
    regions: [
      { id: "NGA-SW", name: "Sud-ovest (Lagos)", population: 60, development: 56, unrest: 24 },
      { id: "NGA-N", name: "Nord", population: 100, development: 34, unrest: 45 },
      { id: "NGA-SE", name: "Delta del Niger", population: 58, development: 42, unrest: 40 },
    ],
    politicalTraits: ["Gigante africano", "Economia petrolifera"],
    relations: {},
  },
};

export const SEED_IDS = Object.keys(SEED_COUNTRIES);
