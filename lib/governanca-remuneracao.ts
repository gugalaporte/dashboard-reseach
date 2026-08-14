/** Matching e carga da remuneração CVM (Formulário de Referência). */

export const REMUNERACAO_EXERCICIO = "2025-12-31";
export const ORGAO_C_SUITE = "Diretoria Estatutária";

export type RemuneracaoOrgao = {
  orgao: string;
  membros: number | null;
  total: number | null;
  salario: number | null;
  bonus: number | null;
  baseadaAcoes: number | null;
};

export type RemuneracaoPayload = {
  ticker: string;
  companyName: string | null;
  matchedName: string | null;
  year: number;
  orgaoFoco: string;
  totalDiretoria: number | null;
  membrosDiretoria: number | null;
  pctEbitda: number | null;
  pctReceita: number | null;
  pctLucro: number | null;
  fonte: string;
  orgaos: RemuneracaoOrgao[];
};

type CvmRow = {
  nome_companhia: string;
  orgao_administracao: string;
  total_remuneracao_orgao: number | null;
  numero_membros: number | null;
  salario: number | null;
  bonus: number | null;
  baseada_acoes: number | null;
  versao: number | null;
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza nome CVM vs LSEG para comparação. */
export function normalizeCompanyName(raw: string): string {
  return stripAccents(raw)
    .toUpperCase()
    .replace(/\bBCO\b/g, "BANCO")
    .replace(/\bS\/A\b/g, " ")
    .replace(/\bS\.?A\.?\b/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(raw: string): string[] {
  const stop = new Set([
    "SA",
    "LTDA",
    "INC",
    "CO",
    "COMPANY",
    "E",
    "DA",
    "DE",
    "DO",
    "DAS",
    "DOS",
    "THE",
  ]);
  return normalizeCompanyName(raw)
    .split(" ")
    .filter((t) => t.length >= 3 && !stop.has(t));
}

/** Token mais específico para o ilike inicial (evita HOLDING, BANCO…). */
export function searchToken(lsegName: string): string | null {
  const generic = new Set([
    "HOLDING",
    "PARTICIPACOES",
    "COMPANHIA",
    "BANCO",
    "ENGENHARIA",
    "TECNOLOGIA",
  ]);
  const tks = tokens(lsegName);
  const branded = [...tks].reverse().find((t) => !generic.has(t));
  return branded ?? tks.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function pickBestCompanyName(
  lsegName: string,
  candidates: string[]
): string | null {
  const target = normalizeCompanyName(lsegName);
  const targetTok = tokens(lsegName);
  let best: string | null = null;
  let bestScore = -1;

  for (const name of candidates) {
    const n = normalizeCompanyName(name);
    if (n === target) return name;
    const ct = tokens(name);
    let score = 0;
    if (n.includes(target) || target.includes(n)) score += 40;
    const overlap = targetTok.filter((t) => ct.includes(t)).length;
    score += overlap * 12;
    score -= Math.abs(ct.length - targetTok.length) * 4;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return bestScore >= 12 ? best : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** CVM em R$; LSEG às vezes vem em milhões. */
export function toReais(v: number | null): number | null {
  if (v == null) return null;
  return Math.abs(v) >= 1_000_000 ? v : v * 1_000_000;
}

export function pctOf(part: number | null, whole: number | null): number | null {
  if (part == null || whole == null || !(whole > 0)) return null;
  const p = (part / whole) * 100;
  return Number.isFinite(p) && p >= 0 && p < 100 ? p : null;
}

function latestByOrgao(rows: CvmRow[]): Map<string, CvmRow> {
  const map = new Map<string, CvmRow>();
  for (const row of rows) {
    const prev = map.get(row.orgao_administracao);
    const v = row.versao ?? 0;
    const pv = prev?.versao ?? -1;
    if (!prev || v > pv) map.set(row.orgao_administracao, row);
  }
  return map;
}

export { num, latestByOrgao };
export type { CvmRow };
