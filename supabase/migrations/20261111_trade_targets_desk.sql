-- Fundo da meta. O texto é o trading_desk de mov_ativo.
-- Sem esta coluna, a mesma compra não pode existir nos dois fundos.

alter table public.trade_targets
  add column if not exists desk text not null default 'FINACAP MAURITSSTAD FIF - CIA';

alter table public.trade_targets
  drop constraint if exists trade_targets_ticker_side_key;

alter table public.trade_targets
  drop constraint if exists trade_targets_ticker_side_desk_key;

alter table public.trade_targets
  add constraint trade_targets_ticker_side_desk_key unique (ticker, side, desk);

alter table public.trade_targets
  drop constraint if exists trade_targets_desk_ok;

alter table public.trade_targets
  add constraint trade_targets_desk_ok
  check (desk in (
    'FINACAP MAURITSSTAD FIF - CIA',
    'FINACAP FIF - CI Mult CP'
  ));
