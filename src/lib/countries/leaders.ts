import { CountryLeader, LEADER_TRAITS, LeaderTrait } from "@/lib/types";
import { Rng } from "@/lib/engine/rng";

/**
 * Procedural fictional leaders for non-seed countries. All names are
 * invented: SOVEREIGN is an alternate-world scenario and never claims to
 * represent real current heads of state.
 */

const FIRST = [
  "Adrian", "Selene", "Marek", "Ilaria", "Tomas", "Nadia", "Viktor", "Amara",
  "Ruben", "Katarina", "Elias", "Zora", "Dario", "Lena", "Mateo", "Iris",
  "Stefan", "Maya", "Aldo", "Petra",
];

const LAST = [
  "Voss", "Karam", "Odell", "Mirren", "Sakala", "Ferro", "Novik", "Adeyemi",
  "Castellan", "Brandt", "Okonjo", "Silvano", "Marchetti", "Duran", "Keller",
  "Rahal", "Vidal", "Moreau", "Lindqvist", "Batari",
];

const IDEOLOGIES = [
  "Conservatorismo nazionale",
  "Socialdemocrazia",
  "Liberalismo tecnocratico",
  "Populismo economico",
  "Centrismo pragmatico",
  "Nazionalismo sviluppista",
  "Riformismo istituzionale",
];

const AMBITIONS = [
  "Consolidare il potere interno",
  "Espandere l'influenza regionale",
  "Modernizzare l'economia",
  "Ottenere prestigio internazionale",
  "Garantire la sicurezza dei confini",
  "Attrarre investimenti esteri",
];

const WEAKNESSES = [
  "Impopolare tra i militari",
  "Dipendente dagli oligarchi",
  "Fragile coalizione di governo",
  "Scandali di corruzione latenti",
  "Opposizione crescente nelle regioni",
  "Economia esposta alle sanzioni",
];

export function generateLeader(rng: Rng): CountryLeader {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const traits: LeaderTrait[] = [];
  while (traits.length < 2) {
    const t = pick(LEADER_TRAITS);
    if (!traits.includes(t)) traits.push(t);
  }
  return {
    name: `${pick(FIRST)} ${pick(LAST)}`,
    title: rng() > 0.5 ? "Presidente" : "Primo Ministro",
    age: 42 + Math.floor(rng() * 30),
    ideology: pick(IDEOLOGIES),
    traits,
    popularity: 35 + Math.floor(rng() * 40),
    ambition: pick(AMBITIONS),
    weakness: pick(WEAKNESSES),
  };
}
