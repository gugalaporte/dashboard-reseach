import type { Format } from "./format";

// Catalogo canonico de metricas exibidas no dashboard.
// Cada metrica tem 1+ aliases (nomes brutos como aparecem em dados_estruturados.metrica).
// A primeira vez que `canonicalMetricId` casar, a linha vira aquela metrica canonica.

export type MetricDef = {
  id: MetricId;
  label: string; // rotulo curto exibido no header da tabela
  aliases: string[]; // nomes brutos no banco (case-sensitive)
  format: Format; // formato de apresentacao
  preferUnit?: string; // unidade default para formatValue
};

// IDs canonicos. Usados como chaves estaveis em estado (URL-safe).
export type MetricId =
  | "pe"
  | "eps"
  | "ev_ebitda"
  | "p_bv"
  | "dy"
  | "roe"
  | "roic"
  | "nd_ebitda"
  | "net_dps"
  | "net_debt"
  | "revenue"
  | "ebitda"
  | "net_income"
  | "free_cash_flow"
  | "capex"
  | "market_cap"
  | "operating_margin"
  | "net_margin"
  | "beta"
  | "ev_sales"
  | "ps"
  | "gross_profit"
  | "operating_income"
  | "total_equity"
  | "ret_1m"
  | "ret_3m"
  | "ret_6m"
  | "ret_ytd"
  | "ret_1y"
  | "total_return"
  | "price_52w_high"
  | "price_52w_low"
  | "target_high"
  | "target_low"
  | "target_median"
  | "enterprise_value"
  | "nd_equity"
  | "current_ratio"
  | "quick_ratio"
  | "interest_coverage"
  | "interest_expense"
  | "cash_from_ops"
  | "depreciation_amort"
  | "bvps"
  | "tangible_bvps"
  | "asset_turnover"
  | "gross_margin"
  | "ebitda_margin"
  | "wacc"
  | "day_volume"
  | "num_buys"
  | "num_holds"
  | "num_sells";

// Ordem = ordem no seletor (pills) e referencia de produto.
// Aliases: nomes brutos em dados_estruturados.metrica (case-sensitive).
export const METRICS: MetricDef[] = [
  { id: "pe", label: "P/E", aliases: ["P/E"], format: "mult" },
  { id: "eps", label: "EPS", aliases: ["EPS"], format: "money" },
  { id: "ev_ebitda", label: "EV/EBITDA", aliases: ["EV/EBITDA"], format: "mult" },
  { id: "p_bv", label: "P/BV", aliases: ["P/BV", "P/BVPS"], format: "mult" },
  {
    id: "dy",
    label: "Dividend Yield",
    aliases: ["Dividend Yield", "Net dividend yield"],
    format: "pct",
  },
  { id: "roe", label: "ROE", aliases: ["ROE"], format: "pct" },
  { id: "roic", label: "ROIC", aliases: ["RoIC", "RoIC (EBIT)"], format: "pct" },
  {
    id: "nd_ebitda",
    label: "ND/EBITDA",
    aliases: ["Net Debt/EBITDA", "Net debt/EBITDA"],
    format: "mult",
  },
  { id: "net_dps", label: "Net DPS", aliases: ["Net DPS"], format: "money" },
  { id: "net_debt", label: "Net Debt", aliases: ["Net Debt"], format: "millions" },
  {
    id: "revenue",
    label: "Revenue",
    aliases: ["Revenue", "Revenues", "Net Revenue", "Net Revenues", "Net revenue"],
    format: "millions",
  },
  {
    id: "ebitda",
    label: "EBITDA",
    aliases: ["EBITDA", "Adj. EBITDA", "Brazil EBITDA"],
    format: "millions",
  },
  {
    id: "net_income",
    label: "Net Income",
    aliases: ["Net Income", "Adjusted Net Income", "Net earnings"],
    format: "millions",
  },
];

/** Métricas extras disponíveis na aba Dados LSEG (além das do Research). */
export const LSEG_EXTRA_METRICS: MetricDef[] = [
  { id: "free_cash_flow", label: "FCF", aliases: ["Free Cash Flow"], format: "millions" },
  { id: "capex", label: "Capex", aliases: ["Capex"], format: "millions" },
  { id: "market_cap", label: "Market Cap", aliases: ["Market Cap"], format: "millions" },
  {
    id: "operating_margin",
    label: "Op. Margin",
    aliases: ["Operating Margin"],
    format: "pct",
  },
  { id: "net_margin", label: "Net Margin", aliases: ["Net Margin"], format: "pct" },
  { id: "beta", label: "Beta", aliases: ["Beta"], format: "mult" },
  { id: "ev_sales", label: "EV/Sales", aliases: ["EV/Sales"], format: "mult" },
  { id: "ps", label: "P/S", aliases: ["P/S", "Price/Sales"], format: "mult" },
  {
    id: "gross_profit",
    label: "Gross Profit",
    aliases: ["Gross Profit"],
    format: "millions",
  },
  {
    id: "operating_income",
    label: "Op. Income",
    aliases: ["Operating Income"],
    format: "millions",
  },
  {
    id: "total_equity",
    label: "Equity",
    aliases: ["Total Equity"],
    format: "millions",
  },
  { id: "ret_1m", label: "Ret 1M", aliases: ["Ret 1M"], format: "pct" },
  { id: "ret_3m", label: "Ret 3M", aliases: ["Ret 3M"], format: "pct" },
  { id: "ret_6m", label: "Ret 6M", aliases: ["Ret 6M"], format: "pct" },
  { id: "ret_ytd", label: "Ret YTD", aliases: ["Ret YTD"], format: "pct" },
  { id: "ret_1y", label: "Ret 1Y", aliases: ["Ret 1Y"], format: "pct" },
  {
    id: "total_return",
    label: "Total Return",
    aliases: ["Total Return"],
    format: "pct",
  },
  {
    id: "price_52w_high",
    label: "52W High",
    aliases: ["52W High"],
    format: "money",
  },
  {
    id: "price_52w_low",
    label: "52W Low",
    aliases: ["52W Low"],
    format: "money",
  },
  {
    id: "target_high",
    label: "Target High",
    aliases: ["Target High"],
    format: "money",
  },
  {
    id: "target_low",
    label: "Target Low",
    aliases: ["Target Low"],
    format: "money",
  },
  {
    id: "target_median",
    label: "Target Med",
    aliases: ["Target Median"],
    format: "money",
  },
  {
    id: "enterprise_value",
    label: "EV",
    aliases: ["Enterprise Value"],
    format: "millions",
  },
  {
    id: "nd_equity",
    label: "ND/Equity",
    aliases: ["Net Debt/Equity"],
    format: "mult",
  },
  {
    id: "current_ratio",
    label: "Current Ratio",
    aliases: ["Current Ratio"],
    format: "mult",
  },
  {
    id: "quick_ratio",
    label: "Quick Ratio",
    aliases: ["Quick Ratio"],
    format: "mult",
  },
  {
    id: "interest_coverage",
    label: "Int. Coverage",
    aliases: ["Interest Coverage"],
    format: "mult",
  },
  {
    id: "interest_expense",
    label: "Int. Expense",
    aliases: ["Interest Expense"],
    format: "millions",
  },
  {
    id: "cash_from_ops",
    label: "CFO",
    aliases: ["Cash From Ops"],
    format: "millions",
  },
  {
    id: "depreciation_amort",
    label: "D&A",
    aliases: ["D&A"],
    format: "millions",
  },
  { id: "bvps", label: "BVPS", aliases: ["BVPS"], format: "money" },
  {
    id: "tangible_bvps",
    label: "TBVPS",
    aliases: ["Tangible BVPS"],
    format: "money",
  },
  {
    id: "asset_turnover",
    label: "Asset Turn.",
    aliases: ["Asset Turnover"],
    format: "mult",
  },
  {
    id: "gross_margin",
    label: "Gross Margin",
    aliases: ["Gross Margin"],
    format: "pct",
  },
  {
    id: "ebitda_margin",
    label: "EBITDA Margin",
    aliases: ["EBITDA Margin"],
    format: "pct",
  },
  { id: "wacc", label: "WACC", aliases: ["WACC"], format: "pct" },
  {
    id: "day_volume",
    label: "Volume",
    aliases: ["Day Volume"],
    format: "number",
  },
  { id: "num_buys", label: "# Buys", aliases: ["Num Buys"], format: "number" },
  {
    id: "num_holds",
    label: "# Holds",
    aliases: ["Num Holds"],
    format: "number",
  },
  {
    id: "num_sells",
    label: "# Sells",
    aliases: ["Num Sells"],
    format: "number",
  },
];

/** Catálogo completo da aba LSEG (Research + extras). */
export const LSEG_METRICS: MetricDef[] = [...METRICS, ...LSEG_EXTRA_METRICS];

export const DEFAULT_LSEG_METRICS: MetricId[] = ["pe", "eps", "ev_ebitda"];

// Map reverso: alias bruto -> id canonico. Construido uma vez.
const ALIAS_TO_ID = new Map<string, MetricId>();
for (const m of METRICS) {
  for (const a of m.aliases) ALIAS_TO_ID.set(a, m.id);
}

// Retorna o id canonico para uma metrica bruta do banco, ou null se nao mapeada.
export function canonicalMetricId(raw: string): MetricId | null {
  return ALIAS_TO_ID.get(raw) ?? null;
}

export function getMetricDef(id: MetricId): MetricDef {
  const def = LSEG_METRICS.find((m) => m.id === id) ?? METRICS.find((m) => m.id === id);
  if (!def) throw new Error(`Unknown metric id: ${id}`);
  return def;
}

// Extrai o ano numerico de um periodo bruto (ex.: "2026E", "12/2026E",
// "2024A", "4Q25" -> 2025, "Current" -> null).
// Retorna null quando o periodo nao tem ano claro (ex.: "12M", "Current").
export function extractYear(periodo: string | null | undefined): string | null {
  if (!periodo) return null;
  // 4Q25 -> 2025 (trimestre). Y assumido 20xx quando veio com 2 digitos.
  const quarter = periodo.match(/^[1-4]Q(\d{2,4})$/i);
  if (quarter) {
    const y = quarter[1];
    return y.length === 2 ? `20${y}` : y;
  }
  // Qualquer sequencia de 4 digitos (2021..2099).
  const m = periodo.match(/(20\d{2})/);
  return m ? m[1] : null;
}

// Metricas default ao abrir o dashboard (3 selecionadas).
export const DEFAULT_METRICS: MetricId[] = ["pe", "eps", "ev_ebitda"];

// Quantas metricas podem ser selecionadas simultaneamente.
export const MAX_SELECTED_METRICS = 3;

// Quantos anos mostrar como sub-colunas.
export const YEARS_PER_METRIC = 3;
