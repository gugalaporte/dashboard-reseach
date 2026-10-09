/** Tipos e texto da diretoria estatutária (executive_officers). */

import { blankToNull } from "./governanca-board";

export type Officer = {
  id: number;
  ticker: string;
  name: string;
  roleLabel: string | null;
  isStatutory: boolean | null;
  isBoardMember: boolean | null;
  electionDate: string | null;
  mandateInfo: string | null;
  startDateRole: string | null;
  bio: string | null;
  sourceUrl: string | null;
  displayOrder: number;
};

export function statutoryOfficers(officers: Officer[]): Officer[] {
  return officers.filter((o) => o.isStatutory !== false);
}

export function countOnBoard(officers: Officer[]): number {
  return officers.filter((o) => o.isBoardMember === true).length;
}

/** Frase do banner no card/modal. */
export function officerHeadline(
  statutory: number,
  onBoard: number
): string | null {
  if (statutory <= 0) return null;
  const n = (v: number, one: string, many: string) =>
    `${v} ${v === 1 ? one : many}`;
  const base = `Diretoria estatutária composta por ${n(statutory, "diretor", "diretores")}`;
  if (onBoard <= 0) return `${base}.`;
  if (onBoard === 1) return `${base}, dos quais 1 também integra o conselho.`;
  return `${base}, dos quais ${onBoard} também integram o conselho.`;
}

export function officerRoleLine(officer: Officer): string | null {
  const parts = [
    blankToNull(officer.roleLabel),
    officer.isStatutory ? "Estatutário" : null,
    officer.isBoardMember ? "Membro do conselho" : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function sortOfficers(officers: Officer[]): Officer[] {
  return [...officers].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id - b.id
  );
}
