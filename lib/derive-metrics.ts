// Derivacao de Net Income por ancora cross-casa (EPS como ponte).
// NI_B = NI_A × (EPS_B / EPS_A), com EPS = Preço / P/E na data do report.

export type DerivedValue = {
  value: number;
  derived: boolean;
  source?: "published" | "calculated";
  formula?: string;
  priceDate?: string;
  anchorBank?: string;
};

export function deriveNetIncomeFromEPS(args: {
  publishedNI: number | null;
  anchorNI: number | null;
  anchorPE: number | null;
  anchorPrice: number | null;
  anchorBank: string | null;
  pe: number | null;
  priceAtReport: number | null;
  priceDate: string | null;
}): DerivedValue | null {
  if (args.publishedNI != null) {
    return { value: args.publishedNI, derived: false, source: "published" };
  }
  if (
    args.anchorNI == null ||
    args.anchorPE == null ||
    args.anchorPrice == null ||
    args.anchorBank == null
  )
    return null;
  if (args.anchorPE <= 0 || args.anchorPrice <= 0) return null;
  if (args.pe == null || args.pe <= 0) return null;
  if (args.priceAtReport == null || args.priceAtReport <= 0) return null;

  const epsOther = args.priceAtReport / args.pe;
  const epsAnchor = args.anchorPrice / args.anchorPE;

  return {
    value: args.anchorNI * (epsOther / epsAnchor),
    derived: true,
    source: "calculated",
    formula: `NI ${args.anchorBank} × (EPS casa / EPS ${args.anchorBank})`,
    priceDate: args.priceDate ?? undefined,
    anchorBank: args.anchorBank,
  };
}

// EPS ausente em dados_estruturados: aproxima por preço e P/E do mesmo report.
export function deriveEPSFromPriceAndPE({
  publishedEPS,
  priceAtReport,
  pe,
  peDate,
}: {
  publishedEPS?: number | null;
  priceAtReport: number;
  pe: number;
  peDate: string;
}): { value: number; derived: boolean; formula?: string; priceDate?: string } {
  if (publishedEPS != null) return { value: publishedEPS, derived: false };
  if (!priceAtReport || !pe) return { value: NaN, derived: false };
  return {
    value: priceAtReport / pe,
    derived: true,
    formula: "Preço no report / P/E",
    priceDate: peDate,
  };
}

// P/E implicito com preço de fechamento (Yahoo) e EPS (publicado ou derivado).
export function deriveCurrentPE({
  eps,
  livePrice,
}: {
  eps: number;
  livePrice: number;
}): number | null {
  if (!eps || !livePrice) return null;
  return livePrice / eps;
}
