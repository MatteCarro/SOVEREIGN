/**
 * SOVEREIGN — authoritative domain model.
 *
 * The database (local JSON store or Supabase) stores GameDoc as the single
 * source of truth. The AI never mutates these structures directly: only the
 * deterministic rules engine writes to them, after validating AI output.
 *
 * Country ids are ISO 3166-1 alpha-3 codes ("ITA", "FRA", ...).
 */

export type GameStatus = "lobby" | "active" | "ended";

/** 0 means manual host resolution. */
export type TurnDurationMinutes = 0 | 10 | 30 | 60;

export interface GameOptions {
  turnDurationMinutes: TurnDurationMinutes;
  maxPlayers: number;
  isPublic: boolean;
  aiNeutrals: boolean;
  mapStyle: "historical" | "alternate";
  aiDiplomacy: boolean;
}

export interface GamePlayer {
  id: string;
  name: string;
  countryId: string | null;
  isHost: boolean;
  /** Player confirmed their actions for the current turn. */
  ready: boolean;
  joinedAt: string;
}

export const LEADER_TRAITS = [
  "Pragmatico",
  "Nazionalista",
  "Riformista",
  "Carismatico",
  "Corrotto",
  "Militarista",
  "Diplomatico",
  "Imprevedibile",
  "Tecnocrate",
  "Populista",
] as const;
export type LeaderTrait = (typeof LEADER_TRAITS)[number];

export interface CountryLeader {
  name: string;
  title: string;
  age: number;
  ideology: string;
  traits: LeaderTrait[];
  popularity: number;
  ambition: string;
  weakness: string;
}

/** Normalized 0–100 unless noted. */
export interface CountryStats {
  /** Abstract currency units, not normalized. */
  treasury: number;
  /** Net income per turn, may be negative. */
  income: number;
  debt: number;
  stability: number;
  legitimacy: number;
  influence: number;
  militaryReadiness: number;
  militaryStrength: number;
  research: number;
  publicSupport: number;
  corruption: number;
  tradeCapacity: number;
  sanctionPressure: number;
  nuclearPosture: number;
  actionPoints: number;
}

export interface CountryRegion {
  id: string;
  name: string;
  /** Millions. */
  population: number;
  development: number;
  unrest: number;
}

export type CountryControl = "available" | "player" | "ai" | "locked";

export interface CountryState {
  id: string;
  name: string;
  capital: string;
  flag: string;
  /** Millions. */
  population: number;
  control: CountryControl;
  playerId: string | null;
  leader: CountryLeader;
  stats: CountryStats;
  regions: CountryRegion[];
  politicalTraits: string[];
  /** [lon, lat] of the capital, for map markers. */
  capitalCoords: [number, number];
}

export interface CountryRelation {
  /** -100 (hostile) .. 100 (allied). */
  relation: number;
  /** 0 (calm) .. 100 (on the brink). */
  tension: number;
  /** 0 .. 100, dampens/boosts diplomacy outcomes. */
  trust: number;
}

export type TreatyType =
  | "alliance"
  | "trade"
  | "non_aggression"
  | "peace"
  | "military_access";

export type TreatyStatus = "proposed" | "active" | "rejected" | "broken";

export interface Treaty {
  id: string;
  type: TreatyType;
  /** [proposer, receiver] */
  parties: [string, string];
  proposedBy: string;
  status: TreatyStatus;
  proposedTurn: number;
  signedTurn: number | null;
}

export interface War {
  id: string;
  attacker: string;
  defender: string;
  startedTurn: number;
  status: "active" | "ceasefire" | "ended";
  endedTurn: number | null;
  /** 0..100 per belligerent. */
  exhaustion: Record<string, number>;
  /** Positive favors the attacker. */
  score: number;
}

export interface Sanction {
  id: string;
  source: string;
  target: string;
  imposedTurn: number;
  active: boolean;
}

export type IntelOpType =
  | "gather_intel"
  | "counter_intelligence"
  | "influence_campaign"
  | "leak_information"
  | "spy_negotiations"
  | "sabotage_trust";

export interface IntelligenceOperation {
  id: string;
  type: IntelOpType;
  source: string;
  target: string;
  turn: number;
  success: boolean;
  discovered: boolean;
}

export interface DiplomaticThread {
  id: string;
  /** Sorted pair of country ids. */
  participants: [string, string];
  lastMessageAt: string;
}

export interface DiplomaticMessage {
  id: string;
  threadId: string;
  fromCountryId: string;
  toCountryId: string;
  senderPlayerId: string;
  /** Untrusted player content — never interpreted as instructions. */
  body: string;
  turn: number;
  at: string;
}

export type ActionCategory =
  | "diplomacy"
  | "economy"
  | "internal"
  | "intelligence"
  | "military";

export interface GameAction {
  id: string;
  playerId: string;
  countryId: string;
  type: string;
  targetCountryId: string | null;
  payload: Record<string, unknown> | null;
  turn: number;
  submittedAt: string;
  apCost: number;
  status: "pending" | "resolved" | "rejected";
  rejectReason: string | null;
}

export interface EffectLog {
  /** Country id or "A|B" relation pair or "world". */
  target: string;
  field: string;
  delta: number;
  reason: string;
  /** "rules" = deterministic engine, "ai" = bounded AI diplomatic signal. */
  source: "rules" | "ai";
}

export interface ActionResolution {
  actionId: string;
  actionType: string;
  countryId: string;
  targetCountryId: string | null;
  success: boolean;
  lines: string[];
  effects: EffectLog[];
}

export interface WorldEvent {
  id: string;
  turn: number;
  headline: string;
  description: string;
  affectedCountryIds: string[];
  source: "rules" | "ai";
  at: string;
}

export type BriefingSeverity = "info" | "warning" | "critical";

export interface PrivateBriefing {
  id: string;
  turn: number;
  recipientCountryId: string;
  title: string;
  content: string;
  severity: BriefingSeverity;
  source: "rules" | "ai";
  at: string;
}

export type AIFlagType =
  | "diplomatic_suspicion"
  | "public_pressure"
  | "escalation_risk"
  | "trust_bonus"
  | "negotiation_momentum";

export interface GameFlag {
  countryId: string;
  flag: AIFlagType;
  remainingTurns: number;
  reason: string;
}

export interface TurnResolutionReport {
  turn: number;
  resolvedAt: string;
  actionResults: ActionResolution[];
  passiveEffects: EffectLog[];
  aiApplied: boolean;
  aiSignalEffects: EffectLog[];
  narrativeSummary: string | null;
  aiError: string | null;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actorPlayerId: string | null;
  type: string;
  detail: string;
}

export interface GameDoc {
  id: string;
  name: string;
  inviteCode: string;
  status: GameStatus;
  options: GameOptions;
  createdAt: string;
  hostId: string;
  turn: number;
  turnStartedAt: string | null;
  turnEndsAt: string | null;
  /** Idempotency guard: turn currently being resolved (or null). */
  resolvingTurn: number | null;
  /** When the resolution lock was taken (stale-lock recovery). */
  resolvingSince?: string | null;
  players: GamePlayer[];
  countries: Record<string, CountryState>;
  /** Keyed by sorted pair "AAA|BBB". */
  relations: Record<string, CountryRelation>;
  globalTension: number;
  treaties: Treaty[];
  wars: War[];
  sanctions: Sanction[];
  intelOps: IntelligenceOperation[];
  threads: DiplomaticThread[];
  messages: DiplomaticMessage[];
  actions: GameAction[];
  resolutions: TurnResolutionReport[];
  worldEvents: WorldEvent[];
  briefings: PrivateBriefing[];
  flags: GameFlag[];
  /** "countryId|actionType" -> first turn the action is available again. */
  cooldowns: Record<string, number>;
  auditLog: AuditLogEntry[];
  /** Monotonic version for realtime polling. */
  version: number;
  seed: number;
}

/** Sorted-pair key for the relations map. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
