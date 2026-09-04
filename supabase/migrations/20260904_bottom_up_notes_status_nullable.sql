-- Pipeline só entra na etapa quando o analista escolhe. Sem default watchlist.
alter table public.bottom_up_notes
  alter column status drop default;

alter table public.bottom_up_notes
  alter column status drop not null;
