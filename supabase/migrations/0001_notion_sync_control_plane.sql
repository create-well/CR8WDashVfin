-- Notion -> Supabase sync worker control plane (contract 1.0.0)
-- Server-only tables: accessed exclusively with the service role key from the
-- worker. Notion remains the source of truth; these tables are the operational
-- mirror plus run bookkeeping. Apply with: supabase db push (or SQL editor).

-- Idempotent normalized mirror keyed by source and Notion page ID.
create table if not exists notion_sync_records (
  source text not null,
  source_page_id text not null,
  source_url text,
  source_last_edited_at timestamptz,
  archived boolean not null default false,
  title text,
  fields jsonb not null default '{}'::jsonb,
  relations jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  synced_at timestamptz not null default now(),
  primary key (source, source_page_id)
);

-- Cursor and last completed run per source.
create table if not exists notion_sync_checkpoints (
  source text primary key,
  contract_version text not null,
  last_run_id text,
  last_cursor text,
  last_completed_at timestamptz,
  records_synced integer not null default 0
);

-- Malformed or conflicting records routed to manual review.
create table if not exists notion_sync_dead_letters (
  id bigint generated always as identity primary key,
  run_id text not null,
  source text not null,
  source_page_id text,
  reason text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Run status, counts, timing, and error class.
create table if not exists notion_sync_runs (
  run_id text primary key,
  mode text not null,
  contract_version text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_planned integer not null default 0,
  total_written integer not null default 0,
  total_dead_letters integer not null default 0,
  error text
);

-- Fail closed for anon/authenticated roles: service role bypasses RLS.
alter table notion_sync_records enable row level security;
alter table notion_sync_checkpoints enable row level security;
alter table notion_sync_dead_letters enable row level security;
alter table notion_sync_runs enable row level security;
