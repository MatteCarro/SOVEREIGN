import type { GameAction, GameDoc, TurnResolutionReport } from "@/lib/types";

/**
 * Client-safe shared types: the per-player game projection returned by
 * GET /api/games/[id]. Built exclusively on the server (see server/view.ts).
 */

export interface ResolverStatus {
  mode: "anthropic" | "mock";
  model: string | null;
}

export interface GameView
  extends Omit<GameDoc, "briefings" | "intelOps" | "messages" | "actions" | "seed" | "resolutions"> {
  myPlayerId: string;
  myCountryId: string | null;
  briefings: GameDoc["briefings"];
  intelOps: GameDoc["intelOps"];
  messages: GameDoc["messages"];
  myPendingActions: GameAction[];
  resolutions: TurnResolutionReport[];
  resolver: ResolverStatus;
  serverNow: string;
}
