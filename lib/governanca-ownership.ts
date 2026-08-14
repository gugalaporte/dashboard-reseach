/** Tipos e labels da composição acionária (LSEG). */

export type OwnershipHolder = {
  name: string;
  type: string | null;
  parentType: string | null;
  shares: number | null;
  pct: number | null;
  holdingsDate: string | null;
};

export type OwnershipPayload = {
  ticker: string;
  ric: string;
  asOf: string | null;
  companyName: string | null;
  immediateParent: string | null;
  ultimateParent: string | null;
  holders: OwnershipHolder[];
};

const TYPE_PT: Record<string, string> = {
  "Government Agency": "Governo",
  "Individual Investor": "Pessoa física",
  "Investment Advisor": "Gestor",
  "Investment Advisor/Hedge Fund": "Gestor / hedge",
  "Sovereign Wealth Fund": "Fundo soberano",
  "Bank and Trust": "Banco",
  "Private Equity": "Private equity",
  "Hedge Fund": "Hedge fund",
  "Pension Fund": "Fundo de pensão",
  "Insurance Company": "Seguradora",
  "Corporation": "Corporação",
  "Holding Company": "Holding",
};

export function blankToNull(v: string | null | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

export function investorTypePt(raw: string | null | undefined): string {
  const s = blankToNull(raw);
  if (!s) return "—";
  return TYPE_PT[s] ?? s;
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export const OWNERSHIP_NAMED = 6;
export const OWNERSHIP_LIST_MIN_PCT = 1;

export function holdersWithMinPct(
  holders: OwnershipHolder[],
  minPct = OWNERSHIP_LIST_MIN_PCT
): OwnershipHolder[] {
  return holders.filter((h) => (h.pct ?? 0) >= minPct);
}

const SLICE_COLORS = [
  "#0F766E",
  "#C026D3",
  "#CA8A04",
  "#E11D48",
  "#1B61B6",
  "#16A34A",
  "#7C3AED",
];

export type OwnershipSlice = {
  name: string;
  pct: number;
  color: string;
};

/** Top acionistas nomeados; o restante até 100% vira "Outros". */
export function buildOwnershipSlices(
  holders: OwnershipHolder[]
): OwnershipSlice[] {
  const ranked = holders
    .map((h) => ({ name: h.name, pct: h.pct ?? 0 }))
    .filter((h) => h.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const named = ranked.slice(0, OWNERSHIP_NAMED);
  const namedSum = named.reduce((s, h) => s + h.pct, 0);
  const outros = Math.max(0, 100 - namedSum);
  const raw = [...named];
  if (outros >= 0.05) raw.push({ name: "Outros", pct: outros });

  return raw
    .sort((a, b) => b.pct - a.pct)
    .map((s, i) => ({
      ...s,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));
}

function foldName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\bS\.?A\.?\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

/** Nome de controlador LSEG em português curto. */
export function formatParentName(raw: string | null | undefined): string | null {
  const s = blankToNull(raw);
  if (!s) return null;
  const fold = foldName(s);
  if (
    (fold.includes("FEDERATIVEREPUBLIC") && fold.includes("BRAZIL")) ||
    (fold.includes("BRAZIL") && fold.includes("GOVERNMENT"))
  ) {
    return "União Federal";
  }
  return s.replace(/\s*\(Government\)\s*$/i, "").trim();
}

export function isIssuerParent(
  parent: string | null | undefined,
  companyName: string | null | undefined
): boolean {
  const p = blankToNull(parent);
  const c = blankToNull(companyName);
  if (!p || !c) return false;
  return foldName(p) === foldName(c);
}

export type ParentView =
  | { kind: "none" }
  | { kind: "one"; name: string }
  | { kind: "two"; immediate: string; ultimate: string };

/** Uma linha se imediato = último; omite parent que é a própria empresa. */
export function parentView(data: {
  companyName: string | null;
  immediateParent: string | null;
  ultimateParent: string | null;
}): ParentView {
  const immRaw = isIssuerParent(data.immediateParent, data.companyName)
    ? null
    : data.immediateParent;
  const ultRaw = isIssuerParent(data.ultimateParent, data.companyName)
    ? null
    : data.ultimateParent;
  const imm = formatParentName(immRaw);
  const ult = formatParentName(ultRaw);
  if (!imm && !ult) return { kind: "none" };
  if (imm && ult && imm === ult) return { kind: "one", name: imm };
  if (imm && !ult) return { kind: "one", name: imm };
  if (!imm && ult) return { kind: "one", name: ult };
  return { kind: "two", immediate: imm!, ultimate: ult! };
}

export function ownershipHeadline(data: {
  holders: OwnershipHolder[];
  companyName: string | null;
  immediateParent: string | null;
  ultimateParent: string | null;
}): string {
  const parents = parentView(data);
  if (parents.kind === "one") return `Controlador: ${parents.name}`;
  if (parents.kind === "two") {
    return `Controlador último: ${parents.ultimate}`;
  }
  const top = data.holders[0]?.pct ?? 0;
  if (top >= 50) return "Há acionista controlador";
  return "Capital pulverizado, sem acionista controlador";
}
