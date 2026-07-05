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

// ── Local store (in-memory + best-effort disk persistence) ───────
//
// A single Node process serves every request, so an in-memory Map is the
// authoritative, always-coherent copy for local multiplayer. Disk writes
// are best-effort persistence so games survive a restart. If the working
// directory is read-only (serverless / Vercel / read-only container), the
// store transparently falls back to /tmp, and if even that fails it runs
// memory-only — it never throws a 500 because of the filesystem.

import os from "os";

const CANDIDATE_DIRS = [
  path.join(process.cwd(), ".data", "games"),
  path.join(os.tmpdir(), "sovereign-games"),
];

class LocalStore implements GameStore {
  private cache = new Map<string, GameDoc>();
  private locks = new Map<string, Promise<unknown>>();
  private dataDir: string | null = null;
  /** Resolves once we've probed the filesystem for a writable dir. */
  private ready: Promise<void>;
  private hydrated = false;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    for (const dir of CANDIDATE_DIRS) {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.access(dir);
        // Probe an actual write — mkdir can succeed on some read-only mounts.
        const probe = path.join(dir, ".probe");
        await fs.writeFile(probe, "ok");
        await fs.rm(probe, { force: true });
        this.dataDir = dir;
        break;
      } catch {
        /* try next candidate */
      }
    }
    if (this.dataDir) {
      await this.hydrate();
    } else {
      console.warn(
        "[sovereign] Nessuna cartella scrivibile trovata: lo store gira in memoria (le partite non sopravvivono al riavvio). Configura Supabase per la persistenza.",
      );
    }
  }

  /** Load persisted games into the cache on first start. */
  private async hydrate() {
    if (this.hydrated || !this.dataDir) return;
    this.hydrated = true;
    try {
      const files = await fs.readdir(this.dataDir);
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        try {
          const raw = await fs.readFile(path.join(this.dataDir, f), "utf8");
          const doc = JSON.parse(raw) as GameDoc;
          if (!this.cache.has(doc.id)) this.cache.set(doc.id, doc);
        } catch {
          /* skip corrupt file */
        }
      }
    } catch {
      /* empty or unreadable dir */
    }
  }

  private file(id: string): string | null {
    if (!this.dataDir) return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid game id");
    return path.join(this.dataDir, `${id}.json`);
  }

  /** Best-effort persistence; downgrades to memory-only on failure. */
  private async persist(doc: GameDoc): Promise<void> {
    const target = this.file(doc.id);
    if (!target) return;
    try {
      const tmp = target + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(doc), "utf8");
      await fs.rename(tmp, target);
    } catch (error) {
      console.warn(
        `[sovereign] Persistenza su disco non riuscita (${(error as Error).message}); proseguo in memoria.`,
      );
      this.dataDir = null; // stop trying; memory remains authoritative
    }
  }

  private withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(id) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.locks.set(id, next.catch(() => undefined));
    return next;
  }

  async listPublicGames(): Promise<GameSummary[]> {
    await this.ready;
    return [...this.cache.values()]
      .filter((d) => d.options.isPublic && d.status !== "ended")
      .map(summarize)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }

  async getGame(id: string): Promise<GameDoc | null> {
    await this.ready;
    return this.cache.get(id) ?? null;
  }

  async findByInvite(code: string): Promise<GameDoc | null> {
    await this.ready;
    const upper = code.toUpperCase();
    for (const doc of this.cache.values()) {
      if (doc.inviteCode === upper) return doc;
    }
    return null;
  }

  async createGame(doc: GameDoc): Promise<void> {
    await this.ready;
    this.cache.set(doc.id, doc);
    await this.persist(doc);
  }

  async updateGame<T>(id: string, mutate: (doc: GameDoc) => T | Promise<T>): Promise<T> {
    await this.ready;
    return this.withLock(id, async () => {
      const doc = this.cache.get(id);
      if (!doc) throw new StoreError("Partita non trovata.", 404);
      const result = await mutate(doc);
      doc.version += 1;
      await this.persist(doc);
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
      : new LocalStore();
  }
  return globalThis.__sovereignStore;
}
