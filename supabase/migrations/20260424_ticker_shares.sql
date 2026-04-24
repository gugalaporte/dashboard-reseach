-- Armazena acoes em circulacao por ticker.
-- Populado via scripts/backfill-shares.ts (back-calculo a partir de P/E + NI + price).
-- Nao e atualizado automaticamente: rodar o script manualmente.
create table if not exists public.ticker_shares (
  ticker text primary key,
  shares_outstanding numeric not null,
  -- Quem forneceu os tres dados usados no back-calculo.
  derived_from_source text not null,
  -- Periodo contabil usado (ex: '2026E').
  derived_from_period text not null,
  derived_at timestamptz not null default now()
);

comment on table public.ticker_shares is
  'Acoes em circulacao por ticker, derivadas de P/E + Net Income + price do report. Nao e fonte oficial.';

-- Leitura liberada para o cliente web (RLS).
-- Escrita so via service_role (scripts de backfill rodam com SUPABASE_KEY service role, que bypassa RLS).
alter table public.ticker_shares enable row level security;

drop policy if exists "ticker_shares_select_public" on public.ticker_shares;
create policy "ticker_shares_select_public"
  on public.ticker_shares
  for select
  using (true);
