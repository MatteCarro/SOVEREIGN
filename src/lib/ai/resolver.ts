import { TurnAIAnalysis } from "./schema";
import { TurnInputSummary } from "@/lib/engine/turn";

/**
 * The AI is a narrative/diplomatic analyst, never an authority on rules.
 * Implementations return a structured analysis that the server validates
 * (Zod) and clamps before applying bounded effects.
 */
export interface DiplomacyAIResolver {
  readonly name: string;
  resolveTurn(input: TurnInputSummary): Promise<TurnAIAnalysis>;
}

import type { ResolverStatus } from "@/lib/view";
export type { ResolverStatus };

export function resolverStatus(): ResolverStatus {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      mode: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-fable-5",
    };
  }
  return { mode: "mock", model: null };
}

/**
 * Server-side factory. Falls back to the mock resolver when no API key is
 * configured — the game remains fully playable, honestly labeled as
 * "analisi simulata" in the UI.
 */
export async function getResolver(): Promise<DiplomacyAIResolver> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const { AnthropicResolver } = await import("./anthropic");
    return new AnthropicResolver(apiKey);
  }
  const { MockResolver } = await import("./mock");
  return new MockResolver();
}
