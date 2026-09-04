-- Remove a etapa redundante "em análise".
update public.bottom_up_notes
  set status = 'watchlist'
  where status = 'analyzing';

alter table public.bottom_up_notes
  drop constraint if exists bottom_up_notes_status_check;

alter table public.bottom_up_notes
  add constraint bottom_up_notes_status_check
  check (status is null or status in ('watchlist', 'thesis_ready', 'position'));
