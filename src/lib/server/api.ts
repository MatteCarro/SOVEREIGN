import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { StoreError } from "./store";

/** Uniform JSON error handling for all API routes. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof StoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Richiesta non valida.", details: error.issues },
        { status: 400 },
      );
    }
    console.error("[sovereign] API error:", error);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}

export const PlayerNameSchema = z
  .string()
  .trim()
  .min(2, "Il nome deve avere almeno 2 caratteri.")
  .max(24, "Il nome può avere al massimo 24 caratteri.");

export const CreateGameSchema = z.object({
  name: z.string().trim().min(2).max(48),
  playerName: PlayerNameSchema,
  options: z.object({
    turnDurationMinutes: z.union([z.literal(0), z.literal(10), z.literal(30), z.literal(60)]),
    maxPlayers: z.number().int().min(2).max(8),
    isPublic: z.boolean(),
    aiNeutrals: z.boolean(),
    mapStyle: z.enum(["historical", "alternate"]),
    aiDiplomacy: z.boolean(),
  }),
});

export const JoinSchema = z.object({
  playerName: PlayerNameSchema,
  code: z.string().trim().length(6).optional(),
});

export const SelectCountrySchema = z.object({
  countryId: z.string().regex(/^[A-Z]{3}$/),
});

export const SubmitActionSchema = z.object({
  type: z.string().min(1).max(64),
  targetCountryId: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  payload: z.record(z.unknown()).nullable().optional(),
});

export const MessageSchema = z.object({
  toCountryId: z.string().regex(/^[A-Z]{3}$/),
  body: z.string().trim().min(1).max(1200),
});

export const ReadySchema = z.object({ ready: z.boolean() });

export const TreatyResponseSchema = z.object({
  treatyId: z.string().min(1),
  accept: z.boolean(),
});
