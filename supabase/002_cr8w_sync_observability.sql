begin;

create table if not exists public.cr8w_sync_runs (
  run_id text primary key,
  started_at timestamptz not null,
  completed_at timestamptz,
  trigger text not null check (trigger in ('manual', 'schedule', 'webhook', 'reconcile')),
  mode text not null check (mode in ('dry_run', 'write', 'reconcile')),
  status text not null check (status in ('running', 'passed', 'failed', 'partial', 'blocked')),
  source_count integer not null default 0 check (source_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  write_count integer not null default 0 check (write_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  lag_seconds integer check (lag_seconds is null or lag_seconds >= 0),
  error_class text,
  operator_context text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cr8w_sync_source_runs (
  run_id text not null references public.cr8w_sync_runs(run_id) on delete cascade,
  source_key text not null,
  status text not null check (status in ('passed', 'failed', 'partial', 'skipped')),
  source_cursor text,
  source_revision text,
  observed_count integer not null default 0 check (observed_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  deleted_count integer not null default 0 check (deleted_count >= 0),
  conflict_count integer not null default 0 check (conflict_count >= 0),
  schema_hash text,
  source_updated_at timestamptz,
  mirror_updated_at timestamptz,
  error_class text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (run_id, source_key)
);

create index if not exists cr8w_sync_runs_started_at_idx on public.cr8w_sync_runs (started_at desc);
create index if not exists cr8w_sync_runs_status_idx on public.cr8w_sync_runs (status, started_at desc);
create index if not exists cr8w_sync_source_runs_source_idx on public.cr8w_sync_source_runs (source_key, created_at desc);

alter table public.cr8w_sync_runs enable row level security;
alter table public.cr8w_sync_runs force row level security;
alter table public.cr8w_sync_source_runs enable row level security;
alter table public.cr8w_sync_source_runs force row level security;

revoke all on table public.cr8w_sync_runs from anon, authenticated;
revoke all on table public.cr8w_sync_source_runs from anon, authenticated;

drop policy if exists "cr8w_sync_runs_no_anon_access" on public.cr8w_sync_runs;
drop policy if exists "cr8w_sync_runs_no_authenticated_access" on public.cr8w_sync_runs;
drop policy if exists "cr8w_sync_source_runs_no_anon_access" on public.cr8w_sync_source_runs;
drop policy if exists "cr8w_sync_source_runs_no_authenticated_access" on public.cr8w_sync_source_runs;

create policy "cr8w_sync_runs_no_anon_access" on public.cr8w_sync_runs for all to anon using (false) with check (false);
create policy "cr8w_sync_runs_no_authenticated_access" on public.cr8w_sync_runs for all to authenticated using (false) with check (false);
create policy "cr8w_sync_source_runs_no_anon_access" on public.cr8w_sync_source_runs for all to anon using (false) with check (false);
create policy "cr8w_sync_source_runs_no_authenticated_access" on public.cr8w_sync_source_runs for all to authenticated using (false) with check (false);

commit;
