-- Ajuste na tabela já criada: moat vira risco + target e rating.
alter table public.bottom_up_notes rename column moat to risk;

alter table public.bottom_up_notes
  add column if not exists target_price numeric;

alter table public.bottom_up_notes
  add column if not exists rating text;

alter table public.bottom_up_notes
  drop constraint if exists bottom_up_notes_rating_check;

alter table public.bottom_up_notes
  add constraint bottom_up_notes_rating_check
  check (rating is null or rating in ('sell', 'neutral', 'buy'));

comment on column public.bottom_up_notes.risk is
  'Riscos da tese de investimento.';
comment on column public.bottom_up_notes.target_price is
  'Preço-alvo (R$).';
comment on column public.bottom_up_notes.rating is
  'Sell, Neutral ou Buy.';
