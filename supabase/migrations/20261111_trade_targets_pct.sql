-- Meta também pode ser porcentagem do PL do fundo.

alter table public.trade_targets
  drop constraint if exists trade_targets_amount_type_check;

alter table public.trade_targets
  add constraint trade_targets_amount_type_check
  check (amount_type in ('qty', 'value', 'pct'));
