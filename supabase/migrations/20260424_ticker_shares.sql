-- Armazena acoes em circulacao por ticker.
-- Tabela legada: antes era alimentada por script de backfill de acoes. O app
-- deixou de usar; Net Income e derivado via ancora cross-casa (ver lib/derive-metrics).
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
