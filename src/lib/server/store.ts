import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { GameDoc } from "@/lib/types";

/**
 * Storage adapters. The server is the only writer: clients never talk to
 * the database directly, so every mutation passes through validation in
 * the API routes regardless of the backend.
 *
 * - LocalJsonStore: zero-config dev mode, one JSON file per game under
 *   .data/. Real multiplayer for any clients pointed at this server.
 * - SupabaseStore: used automatically when SUPABASE env vars are set.
 *   Games live in a `games` table (JSONB doc + optimistic version lock).
 */

export interface GameSummary {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  turn: number;
  turnDurationMinutes: number;
  aiDiplomacy: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface GameStore {
  listPublicGames(): Promise<GameSummary[]>;
  getGame(id: string): Promise<GameDoc | null>;
  findByInvite(code: string): Promise<GameDoc | null>;
  createGame(doc: GameDoc): Promise<void>;
  /**
   * Atomic read-modify-write. The mutator may return a value; throwing
   * aborts the write. Mutations bump doc.version automatically.
   */
  updateGame<T>(id: string, mutate: (doc: GameDoc) => T | Promise<T>): Promise<T>;
}

export function summarize(doc: GameDoc): GameSummary {
  return {
    id: doc.id,
    name: doc.name,
    status: doc.status,
    playerCount: doc.players.length,
    maxPlayers: doc.options.maxPlayers,
    turn: doc.turn,
    turnDurationMinutes: doc.options.turnDurationMinutes,
    aiDiplomacy: doc.options.aiDiplomacy,
    isPublic: doc.options.isPublic,
    createdAt: doc.createdAt,
  };
}

// ── Local JSON store ─────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), ".data", "games");

class LocalJsonStore implements GameStore {
  /** Per-game promise chain = in-process mutex (single Node process). */
  private locks = new Map<string, Promise<unknown>>();

  private file(id: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid game id");
    return path.join(DATA_DIR, `${id}.json`);
  }

  private async read(id: string): Promise<GameDoc | null> {
    try {
      const raw = await fs.readFile(this.file(id), "utf8");
      return JSON.parse(raw) as GameDoc;
    } catch {
      return null;
    }
  }

  private async write(doc: GameDoc): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = this.file(doc.id) + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(doc), "utf8");
    await fs.rename(tmp, this.file(doc.id));
  }

  private withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(id) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.locks.set(id, next.catch(() => undefined));
    return next;
  }

  async listPublicGames(): Promise<GameSummary[]> {
    try {
      const files = await fs.readdir(DATA_DIR);
      const docs = await Promise.all(
        files
          .filter((f) => f.endsWith(".json"))
          .map((f) => this.read(f.replace(/\.json$/, ""))),
      );
      return docs
        .filter((d): d is GameDoc => Boolean(d) && d!.options.isPublic && d!.status !== "ended")
        .map(summarize)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50);
    } catch {
      return [];
    }
  }

  async getGame(id: string): Promise<GameDoc | null> {
    return this.read(id);
  }

  async findByInvite(code: string): Promise<GameDoc | null> {
    try {
      const files = await fs.readdir(DATA_DIR);
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        const doc = await this.read(f.replace(/\.json$/, ""));
        if (doc && doc.inviteCode === code.toUpperCase()) return doc;
      }
    } catch {
      /* no data dir yet */
    }
    return null;
  }

  async createGame(doc: GameDoc): Promise<void> {
    await this.write(doc);
  }

  async updateGame<T>(id: string, mutate: (doc: GameDoc) => T | Promise<T>): Promise<T> {
    return this.withLock(id, async () => {
      const doc = await this.read(id);
      if (!doc) throw new StoreError("Partita non trovata.", 404);
      const result = await mutate(doc);
      doc.version += 1;
      await this.write(doc);
      return result;
    });
  }
}

// ── Supabase store ───────────────────────────────────────────────

class SupabaseStore implements GameStore {
  private clientPromise: Promise<import("@supabase/supabase-js").SupabaseClient> | null = null;

  private client() {
    if (!this.clientPromise) {
      this.clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
        createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        ),
      );
    }
    return this.clientPromise;
  }

  async listPublicGames(): Promise<GameSummary[]> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("games")
      .select("doc")
      .eq("is_public", true)
      .neq("status", "ended")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new StoreError(error.message, 500);
    return (data ?? []).map((row) => summarize(row.doc as GameDoc));
  }

  async getGame(id: string): Promise<GameDoc | null> {
    const supabase = await this.client();
    const { data, error } = await supabase.from("games").select("doc").eq("id", id).maybeSingle();
    if (error) throw new StoreError(error.message, 500);
    return (data?.doc as GameDoc) ?? null;
  }

  async findByInvite(code: string): Promise<GameDoc | null> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from("games")
      .select("doc")
      .eq("invite_code", code.toUpperCase())
      .maybeSingle();
    if (error) throw new StoreError(error.message, 500);
    return (data?.doc as GameDoc) ?? null;
  }

  async createGame(doc: GameDoc): Promise<void> {
    const supabase = await this.client();
    const { error } = await supabase.from("games").insert(this.row(doc));
    if (error) throw new StoreError(error.message, 500);
  }

  private row(doc: GameDoc) {
    return {
      id: doc.id,
      invite_code: doc.inviteCode,
      name: doc.name,
      status: doc.status,
      is_public: doc.options.isPublic,
      version: doc.version,
      created_at: doc.createdAt,
      updated_at: new Date().toISOString(),
      doc,
    };
  }

  async updateGame<T>(id: string, mutate: (doc: GameDoc) => T | Promise<T>): Promise<T> {
    const supabase = await this.client();
    // Optimistic concurrency: retry on version conflicts.
    for (let attempt = 0; attempt < 5; attempt++) {
      const doc = await this.getGame(id);
      if (!doc) throw new StoreError("Partita non trovata.", 404);
      const expectedVersion = doc.version;
      const result = await mutate(doc);
      doc.version = expectedVersion + 1;
      const { data, error } = await supabase
        .from("games")
        .update(this.row(doc))
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("id");
      if (error) throw new StoreError(error.message, 500);
      if (data && data.length > 0) return result;
      await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
    }
    throw new StoreError("Conflitto di scrittura: riprova.", 409);
  }
}

export class StoreError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// ── Factory (cached across HMR reloads) ─────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __sovereignStore: GameStore | undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getStore(): GameStore {
  if (!globalThis.__sovereignStore) {
    globalThis.__sovereignStore = isSupabaseConfigured()
      ? new SupabaseStore()
      : new LocalJsonStore();
  }
  return globalThis.__sovereignStore;
}
