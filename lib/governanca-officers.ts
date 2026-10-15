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

function normRole(role: string): string {
  return role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-–—]/g, " ");
}

/** Presidente ou CEO da companhia. Vice e CEO de área ficam de fora. */
function isCeo(role: string | null): boolean {
  if (!role) return false;
  const r = normRole(role);
  if (/\bvice\b/.test(r)) return false;
  if (/\bceo\s+(de|do|da)\b/.test(r)) return false;
  if (/\bceo\b/.test(r)) return true;
  return /\b(presidente|presidenta)\b/.test(r);
}

/** Financeiro ou CFO. "Negócios financeiros" é área, não o CFO. */
function isCfo(role: string | null): boolean {
  if (!role || isCeo(role)) return false;
  const r = normRole(role);
  if (/\bcfo\b/.test(r)) return true;
  if (/\bnegocios?\s+financeir/.test(r)) return false;
  return /\b(financeiro|financeira|financas)\b/.test(r);
}

function leadRank(officer: Officer): number {
  if (isCeo(officer.roleLabel)) return 0;
  if (isCfo(officer.roleLabel)) return 1;
  return 2;
}

/** CEO, depois CFO, depois a ordem original. */
export function sortOfficers(officers: Officer[]): Officer[] {
  return [...officers].sort(
    (a, b) =>
      leadRank(a) - leadRank(b) ||
      a.displayOrder - b.displayOrder ||
      a.id - b.id
  );
}
