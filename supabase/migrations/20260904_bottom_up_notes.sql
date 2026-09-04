-- Notas qualitativas de bottom-up (aba Tese no screening).
-- Uma linha por ticker; escrita via service_role na API.
create table if not exists public.bottom_up_notes (
  ticker text primary key,
  status text not null default 'watchlist'
    check (status in ('watchlist', 'analyzing', 'thesis_ready', 'position')),
  thesis text not null default '',
  moat text not null default '',
  governance text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.bottom_up_notes is
  'Pipeline e notas de tese/moat/governança por ticker (screening bottom-up).';

alter table public.bottom_up_notes enable row level security;

drop policy if exists "bottom_up_notes_select_public" on public.bottom_up_notes;
create policy "bottom_up_notes_select_public"
  on public.bottom_up_notes
  for select
  using (true);
