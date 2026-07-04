import { z } from "zod";

/**
 * Strict schema for everything the AI is allowed to return.
 * Anything outside this shape is rejected; resource/territory/military
 * changes are structurally impossible to express here.
 */

export const SignalTag = z.enum([
  "friendly",
  "hostile",
  "threatening",
  "conciliatory",
  "deceptive",
  "cooperative",
  "provocative",
  "neutral",
]);

export const FlagType = z.enum([
  "diplomatic_suspicion",
  "public_pressure",
  "escalation_risk",
  "trust_bonus",
  "negotiation_momentum",
]);

export const TurnAIAnalysisSchema = z.object({
  diplomaticSignals: z
    .array(
      z.object({
        sourceCountryId: z.string().min(2).max(3),
        targetCountryId: z.string().min(2).max(3),
        tag: SignalTag,
        intensity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        evidenceMessageIds: z.array(z.string()).max(10),
      }),
    )
    .max(24),
  suggestedFlags: z
    .array(
      z.object({
        countryId: z.string().min(2).max(3),
        flag: FlagType,
        durationTurns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        reason: z.string().max(300),
      }),
    )
    .max(10),
  publicWorldEvents: z
    .array(
      z.object({
        headline: z.string().min(1).max(200),
        description: z.string().min(1).max(600),
        affectedCountryIds: z.array(z.string()).max(8),
      }),
    )
    .max(6),
  privateBriefings: z
    .array(
      z.object({
        recipientCountryId: z.string().min(2).max(3),
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(1000),
        severity: z.enum(["info", "warning", "critical"]),
      }),
    )
    .max(12),
  narrativeSummary: z.string().max(2000),
});

export type TurnAIAnalysis = z.infer<typeof TurnAIAnalysisSchema>;

export const EMPTY_ANALYSIS: TurnAIAnalysis = {
  diplomaticSignals: [],
  suggestedFlags: [],
  publicWorldEvents: [],
  privateBriefings: [],
  narrativeSummary: "",
};

/**
 * Raw JSON Schema handed to the Anthropic structured-output API.
 * Kept in sync with the Zod schema above (which remains the authoritative
 * validator: every AI response is re-validated with Zod server-side).
 */
export const TURN_AI_JSON_SCHEMA = {
  type: "object",
  properties: {
    diplomaticSignals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceCountryId: { type: "string" },
          targetCountryId: { type: "string" },
          tag: {
            type: "string",
            enum: [
              "friendly", "hostile", "threatening", "conciliatory",
              "deceptive", "cooperative", "provocative", "neutral",
            ],
          },
          intensity: { type: "integer", enum: [1, 2, 3] },
          evidenceMessageIds: { type: "array", items: { type: "string" } },
        },
        required: ["sourceCountryId", "targetCountryId", "tag", "intensity", "evidenceMessageIds"],
        additionalProperties: false,
      },
    },
    suggestedFlags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          countryId: { type: "string" },
          flag: {
            type: "string",
            enum: [
              "diplomatic_suspicion", "public_pressure", "escalation_risk",
              "trust_bonus", "negotiation_momentum",
            ],
          },
          durationTurns: { type: "integer", enum: [1, 2, 3] },
          reason: { type: "string" },
        },
        required: ["countryId", "flag", "durationTurns", "reason"],
        additionalProperties: false,
      },
    },
    publicWorldEvents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          description: { type: "string" },
          affectedCountryIds: { type: "array", items: { type: "string" } },
        },
        required: ["headline", "description", "affectedCountryIds"],
        additionalProperties: false,
      },
    },
    privateBriefings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          recipientCountryId: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "critical"] },
        },
        required: ["recipientCountryId", "title", "content", "severity"],
        additionalProperties: false,
      },
    },
    narrativeSummary: { type: "string" },
  },
  required: [
    "diplomaticSignals", "suggestedFlags", "publicWorldEvents",
    "privateBriefings", "narrativeSummary",
  ],
  additionalProperties: false,
} as const;
