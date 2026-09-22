-- Datas das metas de compra/venda (aba Execução).
alter table public.trade_targets
  add column if not exists start_date date,
  add column if not exists due_date date;

comment on column public.trade_targets.start_date is 'Data inicial da meta.';
comment on column public.trade_targets.due_date is 'Fazer até (prazo da meta).';

alter table public.trade_targets
  drop constraint if exists trade_targets_dates_ok;
alter table public.trade_targets
  add constraint trade_targets_dates_ok
  check (start_date is null or due_date is null or due_date >= start_date);
