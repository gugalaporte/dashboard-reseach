# Finacap Research — Dashboard

Dashboard de equity research em **Next.js 14 (App Router)** consumindo Supabase
já populado por um pipeline que extrai métricas de PDFs de corretoras.

## Stack

Next.js 14 · TypeScript · Tailwind · shadcn/ui · @tanstack/react-table · @supabase/supabase-js · lucide-react.

## Setup

1. `cp .env.local.example .env.local` e cole a **anon key** (não use service_role).
2. As RLS policies de leitura já estão aplicadas nas tabelas.
3. `npm run dev`

Sem SQL manual. A agregação é feita no cliente a partir de `dados_estruturados` + `stock_guide`.

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto (`https://liyqnjsphrqudkgxhcup.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave `anon` (pública). **Nunca** use `service_role` aqui. |

## Arquitetura

```
app/
  layout.tsx          -- root
  page.tsx            -- dashboard (cards + filtros + tabela + drawer)
  globals.css         -- paleta em CSS vars + scrollbar
components/
  research-table.tsx  -- TanStack, colunas memoizadas, zebra, sort
  metric-cell.tsx     -- valor em cima + (periodo · data) subordinado
  rating-cell.tsx     -- badge colorido + data abaixo
  company-search.tsx  -- combobox multi com <Command>
  source-filter.tsx   -- Select de fonte
  date-filter.tsx     -- Select de periodo (7/30/90/tudo)
  summary-cards.tsx   -- 4 cards de topo
  company-drawer.tsx  -- Sheet com matriz metrica x periodo + PDFs
  ui/*                -- primitivas shadcn (button, badge, table, ...)
lib/
  supabase.ts         -- createClient com anon key
  queries.ts          -- getResearch, getEmpresas, getSummaryStats, buildRows, FONTES, Cell, ResearchRow
  format.ts           -- pt-BR: formatValue (money/millions/mult/pct) + formatDateShort
  utils.ts            -- cn()
types/
  research.ts         -- MetricaRow, PdfDoc, PeriodoFilter (usados no drawer)
```

### Modelo de dados do frontend

Em `lib/queries.ts`:

```ts
type Cell = {
  value: number;
  date: string | null;
  periodo?: string | null;
  unidade?: string | null;
  pdf_id?: number | null;
};

type ResearchRow = {
  empresa: string;
  fonte: 'BTG Pactual' | 'Bradesco BBI' | 'Safra';
  rating?: { value: string; date: string | null };
  price?:  { value: number; date: string | null };
  target?: Cell & { ccy: string };
  pe?: Cell; ev_ebitda?: Cell; dy?: Cell; roic?: Cell;
  revenue?: Cell; ebitda?: Cell; net_debt?: Cell; net_income?: Cell;
};
```

Cada célula numérica carrega seu próprio `date`/`periodo` — o `MetricCell` renderiza o valor com a data subordinada logo abaixo.

## Como adicionar uma nova métrica

1. Em `lib/queries.ts#buildRows`, adicione no objeto de retorno: `nova_metrica: pick('Nome No Banco')`.
2. Em `ResearchRow`, adicione o campo: `nova_metrica?: Cell`.
3. Em `components/research-table.tsx`, adicione uma coluna nova no array memoizado `columns` com o formatter certo (`mult`, `pct`, `millions`, `money`).

## Migração: view descontinuada

A versão anterior do projeto usava `public.v_research_latest`. Agora a agregação roda no cliente. Para limpar:

```sql
DROP VIEW IF EXISTS public.v_research_latest;
```

## Notas sobre a base real (abril/2026)

- 3 fontes populadas: **BTG Pactual**, **Bradesco BBI**, **Safra**.
- Ratings existentes: `Outperform`, `Neutral`, `Underperform`, `Not Rated`, `Under Review`, `n.a.`. Cor: Outperform→verde, Underperform→vermelho, resto→cinza (neutro).
- `stock_guide` serve como **fallback** para P/E, EV/EBITDA e Div. Yield quando `dados_estruturados` não tem a métrica — com preferência 2026 > 2027 > 2025.
- Empresas sem nenhum registro em `dados_estruturados` mas com `stock_guide` ainda aparecem na tabela (rating + preço + fallbacks preenchidos, resto `—`).
