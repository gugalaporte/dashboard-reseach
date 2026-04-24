// Derivacao de metricas a partir de identidades contabeis.
// Hoje so Net Income. Outros podem ser adicionados seguindo o mesmo padrao.

// Resultado de uma derivacao (ou de um valor ja publicado).
// - derived=false: valor veio publicado no relatorio, sem calculo.
// - derived=true: valor calculado via formula. Inputs usados ficam em formula/priceDate.
export type DerivedValue = {
  value: number;
  derived: boolean;
  source?: "published" | "calculated";
  formula?: string; // label humano pra tooltip.
  priceDate?: string;
};

// Net Income = Market Cap / P/E = (Preco no report × Acoes) / P/E.
// Retorna null quando nao da pra publicar valor (NI nulo e algum input faltando).
// Nunca divide por zero: P/E<=0 -> null.
export function deriveNetIncome(args: {
  publishedNI: number | null;
  priceAtReport: number | null;
  priceDate: string | null;
  pe: number | null;
  sharesOutstanding: number | null;
}): DerivedValue | null {
  if (args.publishedNI != null) {
    return { value: args.publishedNI, derived: false, source: "published" };
  }
  if (args.pe == null || args.pe <= 0) return null;
  if (args.priceAtReport == null) return null;
  if (args.sharesOutstanding == null) return null;
  const marketCap = args.priceAtReport * args.sharesOutstanding;
  return {
    value: marketCap / args.pe,
    derived: true,
    source: "calculated",
    formula: "Preco no report × Acoes / P/E",
    priceDate: args.priceDate ?? undefined,
  };
}
