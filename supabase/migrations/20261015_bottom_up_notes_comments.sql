-- Anotações livres da aba Tese, além de tese, riscos e governança.
alter table public.bottom_up_notes
  add column if not exists comments text not null default '';

comment on column public.bottom_up_notes.comments is
  'Anotações e comentários livres sobre o papel.';
