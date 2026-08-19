/** Tipos e parser da síntese em ceo_analise. */

export type CeoAnalise = {
  ticker: string;
  companyName: string | null;
  ceoName: string | null;
  synthesisCeo: string | null;
  synthesisVeredito: string | null;
  synthesisText: string | null;
  alignmentVeredito: string | null;
  riskLevel: string | null;
  trackRecordReport: string | null;
  alignmentReport: string | null;
  companySummary: string | null;
  boardPanorama: string | null;
  boardMemberCount: number | null;
  hasFiscalCouncil: boolean | null;
  fiscalCouncilMemberCount: number | null;
  updatedAt: string | null;
};

export type SynthesisParsed = {
  summary: string;
  strengths: string[];
  risks: string[];
};

function bullets(block: string): string[] {
  const items: string[] = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*[-*]\s+(.+)/);
    if (m?.[1]) items.push(m[1].trim());
  }
  return items;
}

/** Separa resumo, pontos fortes e riscos do markdown de síntese. */
export function parseSynthesis(raw: string | null | undefined): SynthesisParsed {
  if (!raw?.trim()) return { summary: "", strengths: [], risks: [] };
  const text = raw.replace(/\r\n/g, "\n");
  const [head = "", afterStrengths = ""] = text.split(/\*\*Pontos fortes\*\*/i);
  const [strengthsBlock = "", risksBlock = ""] = afterStrengths.split(
    /\*\*Riscos\*\*/i
  );

  const summary = head
    .replace(/^#+\s*SÍNTESE\s*/i, "")
    .replace(/^VEREDITO:.*$/im, "")
    .replace(/^CEO:.*$/im, "")
    .trim();

  return {
    summary,
    strengths: bullets(strengthsBlock),
    risks: bullets(risksBlock),
  };
}

/** Quebra o panorama do conselho em itens (bullets ou um parágrafo). */
export function parseBoardPanorama(
  raw: string | null | undefined
): string[] {
  if (!raw?.trim()) return [];
  const text = raw.replace(/\r\n/g, "\n").trim();
  const items = bullets(text);
  return items.length > 0 ? items : [text];
}

export function hasBoardData(row: {
  boardMemberCount: number | null;
  boardPanorama: string | null;
  hasFiscalCouncil: boolean | null;
}): boolean {
  return (
    row.boardMemberCount != null ||
    Boolean(row.boardPanorama?.trim()) ||
    row.hasFiscalCouncil != null
  );
}

export function ceoInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name
    .replace(/\(.*\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}
