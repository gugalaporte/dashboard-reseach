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
  | "net_income";

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
  const def = METRICS.find((m) => m.id === id);
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
