/** Blocos simples de markdown (relatórios de CEO). */

export type MdBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((s) => s.trim());
}

function isTableSep(line: string): boolean {
  return /^\|?[\s:|-]+$/.test(line) && line.includes("-");
}

function isSpecial(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^---+$/.test(t)) return true;
  if (/^#{1,4}\s+/.test(t)) return true;
  if (t.startsWith("|")) return true;
  if (/^[-*]\s+/.test(t)) return true;
  if (/^\d+\.\s+/.test(t)) return true;
  return false;
}

/** Converte markdown em blocos para a UI do relatório. */
export function parseMdBlocks(raw: string): MdBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const hm = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (hm) {
      blocks.push({ type: "heading", level: hm[1].length, text: hm[2].trim() });
      i += 1;
      continue;
    }

    const next = lines[i + 1]?.trim() ?? "";
    if (trimmed.startsWith("|") && isTableSep(next)) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && !isTableSep(lines[i].trim())) {
        rows.push(splitTableRow(lines[i].trim()));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const ul = trimmed.match(/^[-*]\s+(.+)/);
    if (ul) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*]\s+(.+)/);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    const ol = trimmed.match(/^\d+\.\s+(.+)/);
    if (ol) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+\.\s+(.+)/);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const parts = [trimmed];
    i += 1;
    while (i < lines.length && !isSpecial(lines[i])) {
      parts.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: parts.join(" ") });
  }

  return blocks;
}
