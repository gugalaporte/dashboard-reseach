/** Tipos e labels dos membros do conselho (board_members). */

export type BoardMember = {
  id: number;
  ticker: string;
  councilType: string;
  name: string;
  roleLabel: string | null;
  isIndependent: boolean | null;
  electionDate: string | null;
  mandateInfo: string | null;
  bio: string | null;
  nominatedBy: string | null;
  displayOrder: number;
};

export type BoardGroup = {
  type: string;
  members: BoardMember[];
};

export const COUNCIL_ADMIN = "Conselho de Administração";
export const COUNCIL_FISCAL = "Conselho Fiscal";
export const BIO_PREVIEW_CHARS = 280;

export function blankToNull(v: string | null | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

/** Agrupa por órgão; administração vem antes do fiscal. */
export function groupByCouncil(members: BoardMember[]): BoardGroup[] {
  const map = new Map<string, BoardMember[]>();
  for (const m of members) {
    const key = m.councilType.trim() || "Outros";
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  }
  const preferred = [COUNCIL_ADMIN, COUNCIL_FISCAL];
  const keys = [...map.keys()].sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }
    return a.localeCompare(b, "pt-BR");
  });
  return keys.map((type) => ({ type, members: map.get(type) ?? [] }));
}

export function countByCouncil(
  members: BoardMember[],
  type: string
): number {
  return members.filter((m) => m.councilType === type).length;
}

/** Frase do banner: tamanho do conselho e, se houver, do fiscal. */
export function boardHeadline(
  adminCount: number,
  fiscalCount: number
): string | null {
  if (adminCount <= 0 && fiscalCount <= 0) return null;
  const n = (v: number, one: string, many: string) =>
    `${v} ${v === 1 ? one : many}`;
  if (adminCount > 0 && fiscalCount > 0) {
    return `Conselho de Administração composto por ${n(adminCount, "membro", "membros")}, apoiado por um Conselho Fiscal instalado de ${n(fiscalCount, "integrante", "integrantes")}.`;
  }
  if (adminCount > 0) {
    return `Conselho de Administração composto por ${n(adminCount, "membro", "membros")}.`;
  }
  return `Conselho Fiscal instalado de ${n(fiscalCount, "integrante", "integrantes")}.`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Formata data ISO; deixa texto livre (ex.: "Não divulgado") como está. */
export function formatElectionDate(raw: string | null | undefined): string | null {
  const s = blankToNull(raw);
  if (!s) return null;
  const m = s.match(ISO_DATE);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Linha cinza: eleição e mandato. */
export function mandateLine(
  electionDate: string | null,
  mandateInfo: string | null
): string | null {
  const election = formatElectionDate(electionDate);
  const mandate = blankToNull(mandateInfo);
  const parts: string[] = [];
  if (election) parts.push(`Eleito em ${election}`);
  if (mandate) {
    const hasAte = mandate.toLocaleLowerCase("pt-BR").startsWith("até");
    parts.push(hasAte ? `mandato ${mandate}` : `mandato até ${mandate}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function bioNeedsToggle(bio: string | null): boolean {
  return (bio?.trim().length ?? 0) > BIO_PREVIEW_CHARS;
}

export function bioPreview(bio: string): string {
  const t = bio.trim();
  if (t.length <= BIO_PREVIEW_CHARS) return t;
  return `${t.slice(0, BIO_PREVIEW_CHARS).trimEnd()}…`;
}
