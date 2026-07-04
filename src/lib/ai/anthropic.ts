import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DiplomacyAIResolver } from "./resolver";
import { TurnAIAnalysis, TurnAIAnalysisSchema, TURN_AI_JSON_SCHEMA } from "./schema";
import { RESOLVER_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { TurnInputSummary } from "@/lib/engine/turn";

/**
 * Real resolver backed by the Anthropic API (server-side only — the key
 * never reaches the browser). Uses structured JSON output; the response is
 * still re-validated with Zod before anything touches game state.
 *
 * Default model: claude-fable-5 (configurable via ANTHROPIC_MODEL).
 * On claude-fable-5 we opt into server-side refusal fallbacks so a safety
 * false-positive on benign game content is transparently re-served by
 * claude-opus-4-8 within the same call.
 */
export class AnthropicResolver implements DiplomacyAIResolver {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || process.env.ANTHROPIC_MODEL || "claude-fable-5";
  }

  async resolveTurn(input: TurnInputSummary): Promise<TurnAIAnalysis> {
    const isFable = this.model.startsWith("claude-fable");
    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 8192,
      ...(isFable
        ? {
            betas: ["server-side-fallback-2026-06-01"],
            fallbacks: [{ model: "claude-opus-4-8" }],
          }
        : {}),
      system: RESOLVER_SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: TURN_AI_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("AI resolver: la richiesta è stata rifiutata dai classificatori di sicurezza.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("AI resolver: risposta troncata (max_tokens).");
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI resolver: nessun blocco di testo nella risposta.");
    }
    const parsed: unknown = JSON.parse(textBlock.text);
    // Zod is the authoritative gate: anything outside the schema is dropped here.
    return TurnAIAnalysisSchema.parse(parsed);
  }
}
