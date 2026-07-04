import {
  CountryRelation,
  CountryStats,
  EffectLog,
  GameDoc,
  clamp,
  pairKey,
} from "@/lib/types";

/** Stats that are normalized 0–100. */
const NORMALIZED: (keyof CountryStats)[] = [
  "stability", "legitimacy", "influence", "militaryReadiness",
  "militaryStrength", "research", "publicSupport", "corruption",
  "tradeCapacity", "sanctionPressure", "nuclearPosture",
];

export function getRelation(doc: GameDoc, a: string, b: string): CountryRelation {
  const key = pairKey(a, b);
  if (!doc.relations[key]) {
    doc.relations[key] = { relation: 0, tension: 5, trust: 50 };
  }
  return doc.relations[key];
}

/**
 * Effect collector: the only writer of game state during resolution.
 * Every change is clamped and logged so the UI can always answer
 * "what changed and why".
 */
export class Fx {
  logs: EffectLog[] = [];

  constructor(
    private doc: GameDoc,
    private source: "rules" | "ai",
  ) {}

  stat(countryId: string, field: keyof CountryStats, delta: number, reason: string) {
    const country = this.doc.countries[countryId];
    if (!country || delta === 0) return;
    const before = country.stats[field];
    let after = before + delta;
    if (NORMALIZED.includes(field)) after = clamp(after);
    if (field === "treasury" || field === "debt") after = Math.max(0, after);
    if (field === "actionPoints") after = clamp(after, 0, 12);
    country.stats[field] = Math.round(after * 10) / 10;
    const applied = country.stats[field] - before;
    if (applied !== 0) {
      this.logs.push({
        target: countryId, field, delta: Math.round(applied * 10) / 10,
        reason, source: this.source,
      });
    }
  }

  rel(a: string, b: string, field: keyof CountryRelation, delta: number, reason: string) {
    if (delta === 0 || a === b) return;
    const rel = getRelation(this.doc, a, b);
    const before = rel[field];
    const min = field === "relation" ? -100 : 0;
    rel[field] = Math.round(clamp(before + delta, min, 100) * 10) / 10;
    const applied = rel[field] - before;
    if (applied !== 0) {
      this.logs.push({
        target: pairKey(a, b), field, delta: Math.round(applied * 10) / 10,
        reason, source: this.source,
      });
    }
  }

  world(delta: number, reason: string) {
    if (delta === 0) return;
    const before = this.doc.globalTension;
    this.doc.globalTension = Math.round(clamp(before + delta) * 10) / 10;
    const applied = this.doc.globalTension - before;
    if (applied !== 0) {
      this.logs.push({
        target: "world", field: "globalTension", delta: Math.round(applied * 10) / 10,
        reason, source: this.source,
      });
    }
  }
}
