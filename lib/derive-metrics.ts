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
