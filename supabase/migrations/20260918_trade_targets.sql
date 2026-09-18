-- Metas de compra/venda na aba Execução.
-- Uma linha por papel + lado; escrita via service_role na API.
create table if not exists public.trade_targets (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  side text not null check (side in ('buy', 'sell')),
  amount_type text not null check (amount_type in ('qty', 'value')),
  amount numeric(18, 4) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticker, side)
);

comment on table public.trade_targets is
  'Metas de compra/venda por ticker (aba Execução).';

alter table public.trade_targets enable row level security;

drop policy if exists "trade_targets_select_public" on public.trade_targets;
create policy "trade_targets_select_public"
  on public.trade_targets
  for select
  using (true);
