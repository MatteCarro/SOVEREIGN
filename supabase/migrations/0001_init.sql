-- SOVEREIGN — Supabase schema.
--
-- Architecture note: the game server is the ONLY writer. Clients never
-- talk to Postgres directly — every mutation passes through the Next.js
-- API routes (service role), where ownership, costs and cooldowns are
-- validated and the deterministic rules engine runs. RLS therefore locks
-- the tables down completely for anon/authenticated roles: the service
-- role bypasses RLS by design.
--
-- The authoritative game state lives in games.doc (JSONB). The mirrored
-- columns (status, invite_code, ...) exist for indexing and lobby queries.
-- The normalized read-model tables below are OPTIONAL projections you can
-- populate for analytics/BI; the MVP runtime does not require them.

create table if not exists public.games (
  id          text primary key,
  invite_code text not null,
  name        text not null,
  status      text not null default 'lobby',
  is_public   boolean not null default true,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  doc         jsonb not null
);

create unique index if not exists games_invite_code_idx on public.games (invite_code);
create index if not exists games_public_idx on public.games (is_public, status, created_at desc);

-- Optimistic concurrency is enforced by the server:
--   update ... where id = $1 and version = $expected
-- (see src/lib/server/store.ts, SupabaseStore.updateGame).

-- ── Optional normalized read model (analytics / dashboards) ─────
create table if not exists public.game_players (
  game_id    text not null references public.games (id) on delete cascade,
  player_id  text not null,
  name       text not null,
  country_id text,
  is_host    boolean not null default false,
  joined_at  timestamptz not null default now(),
  primary key (game_id, player_id)
);

create table if not exists public.audit_log (
  id        bigint generated always as identity primary key,
  game_id   text not null references public.games (id) on delete cascade,
  at        timestamptz not null default now(),
  actor     text,
  type      text not null,
  detail    text not null
);

create index if not exists audit_log_game_idx on public.audit_log (game_id, at desc);

-- ── Row Level Security ──────────────────────────────────────────
-- Deny-all for client roles: only the service role (server) may touch
-- game state. This is the strictest possible policy and matches the
-- server-authoritative architecture (private briefings and intel never
-- reach a client unfiltered).

alter table public.games        enable row level security;
alter table public.game_players enable row level security;
alter table public.audit_log    enable row level security;

-- No policies are created for anon/authenticated ⇒ all access denied.
-- If you later move auth to Supabase Auth and want clients to read the
-- public lobby directly, add a narrow SELECT policy, e.g.:
--
--   create policy "public lobby summaries"
--     on public.games for select
--     to authenticated
--     using (is_public = true);
--
-- Never expose games.doc to clients: it contains every player's private
-- briefings and intelligence operations.

comment on table public.games is
  'Authoritative SOVEREIGN game documents (JSONB). Server-only access via service role.';
