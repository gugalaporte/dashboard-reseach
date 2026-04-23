# Finacap Research — Dashboard

Dashboard de equity research em **Next.js 14 (App Router)** consumindo Supabase
já populado por um pipeline que extrai métricas de PDFs de corretoras.

## Stack

Next.js 14 · TypeScript · Tailwind · shadcn/ui · @tanstack/react-table · @supabase/supabase-js · lucide-react.

## Setup

```bash
cp .env.local.example .env.local
# edite .env.local com a chave ANON do Supabase (nao use service_role no frontend)
npm install
npm run dev
```

Abre em <http://localhost:3000>.

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto (`https://liyqnjsphrqudkgxhcup.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave `anon` (pública). **Nunca** use `service_role` aqui. |

## SQL necessário no Supabase

Rode isto uma vez no SQL Editor. Cria a view que o dashboard consome.

```sql
CREATE OR REPLACE VIEW v_research_latest AS
WITH ranked AS (
  SELECT
    empresa, fonte, metrica, periodo, valor, unidade, data_relatorio, pdf_id,
    ROW_NUMBER() OVER (
      PARTITION BY empresa, fonte, metrica
      ORDER BY data_relatorio DESC,
               CASE WHEN periodo ~ 'E$' THEN 1 ELSE 0 END DESC,
               periodo DESC
    ) AS rn
  FROM dados_estruturados
)
SELECT
  empresa,
  fonte,
  MAX(data_relatorio) FILTER (WHERE rn = 1) AS data_relatorio,
  MAX(valor)   FILTER (WHERE metrica='Target Price'   AND rn=1) AS target_price,
  MAX(unidade) FILTER (WHERE metrica='Target Price'   AND rn=1) AS target_ccy,
  MAX(valor)   FILTER (WHERE metrica='P/E'            AND rn=1) AS pe,
  MAX(valor)   FILTER (WHERE metrica='EV/EBITDA'      AND rn=1) AS ev_ebitda,
  MAX(valor)   FILTER (WHERE metrica='Dividend Yield' AND rn=1) AS dy,
  MAX(valor)   FILTER (WHERE metrica='RoIC'           AND rn=1) AS roic,
  MAX(valor)   FILTER (WHERE metrica='Revenue'        AND rn=1) AS revenue,
  MAX(valor)   FILTER (WHERE metrica='EBITDA'         AND rn=1) AS ebitda,
  MAX(valor)   FILTER (WHERE metrica='Net Debt'       AND rn=1) AS net_debt,
  MAX(valor)   FILTER (WHERE metrica='Net Income'     AND rn=1) AS net_income
FROM ranked
GROUP BY empresa, fonte;
```

### Policies mínimas (se RLS estiver ligado)

```sql
-- Leitura pública das três tabelas + view
ALTER TABLE dados_estruturados ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_guide ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read" ON dados_estruturados FOR SELECT TO anon USING (true);
CREATE POLICY "anon read" ON stock_guide        FOR SELECT TO anon USING (true);
CREATE POLICY "anon read" ON pdf_documents      FOR SELECT TO anon USING (true);
-- Views herdam dos tables base.
```

## Arquitetura

```
app/
  layout.tsx          -- root, fonte do sistema, bg surface-soft
  page.tsx            -- dashboard (cards + filtros + tabela + drawer)
  globals.css         -- paleta em CSS vars + scrollbar
components/
  research-table.tsx  -- TanStack, colunas memoizadas, zebra, sort
  company-search.tsx  -- combobox multi com <Command>
  source-filter.tsx   -- Select de fonte
  date-filter.tsx     -- Select de periodo (7/30/90/tudo)
  summary-cards.tsx   -- 4 cards de topo
  company-drawer.tsx  -- Sheet com matriz metrica x periodo + PDFs
  ui/*                -- primitivas shadcn (button, badge, table, ...)
lib/
  supabase.ts         -- createClient com anon key
  queries.ts          -- getResearch, getEmpresas, getSummaryStats, ...
  format.ts           -- pt-BR: money, millions, pct, multiple
  utils.ts            -- cn()
types/
  research.ts         -- ResearchRow, StockGuideRow, Fonte, ...
```

## Como adicionar uma nova métrica

1. **SQL** — adicione a coluna no agregado da view:
   ```sql
   MAX(valor) FILTER (WHERE metrica='NomeNoBanco' AND rn=1) AS nome_coluna
   ```
2. **Tipo** — em `types/research.ts`, adicione em `ResearchLatestRow`:
   ```ts
   nome_coluna: number | null;
   ```
3. **Tabela** — em `components/research-table.tsx`, crie uma coluna nova no array memoizado `columns` com o formatter certo (`formatMultiple`, `formatPct`, `formatMillions`...).

## Notas sobre a base real (abril/2026)

- 3 fontes populadas: **BTG Pactual**, **Bradesco BBI**, **Safra** (sem Itaú BBA).
- `stock_guide` tem schema *wide* próprio: `source_bank`, `report_date`, `price_date`, `ticker`, `rating`, `price`, `pe_{2025..2027}`, `ev_ebitda_{2025..2027}`, `div_yield_{2025..2027}_pct`. O join no cliente usa apenas `rating` — `target_price` vem de `v_research_latest`.
- Ratings existentes: `Outperform`, `Neutral`, `Underperform`, `Not Rated`, `Under Review`, `n.a.`. Mapeamento de cor em `research-table.tsx#ratingClass`.
