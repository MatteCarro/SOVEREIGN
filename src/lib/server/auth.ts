import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

/**
 * Lightweight session identity for the MVP: an httpOnly random id cookie.
 * Display names are provided when creating/joining a game and stored in the
 * game document. With Supabase configured, this can be swapped for
 * Supabase Auth without touching the API surface (the routes only need a
 * stable player id).
 */

const COOKIE = "sovereign_uid";

export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function requireSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const id = randomBytes(16).toString("hex");
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}
