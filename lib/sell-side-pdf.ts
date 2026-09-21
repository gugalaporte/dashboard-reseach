import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { foldName, pdfBaseName, samePdfName } from "./pdf-name";

export { pdfBaseName, samePdfName };

/** Trecho compartilhado no OneDrive de todo mundo. */
export const SELL_SIDE_RELATIVE = path.join(
  "FINACAP CONSULT FINANC MERC CAP LTDA",
  "Pesquisa - Documentos",
  "10_Dados_Primários",
  "Sell Side_Reports"
);

const FONTE_FOLDERS: Record<string, string[]> = {
  "BTG Pactual": ["btg"],
  "Bradesco BBI": ["bradesco"],
  Safra: ["safra"],
  "Itaú BBA": ["itaú", "itau"],
};

function existsDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function isPreferredFolder(folderName: string, fonte: string | null | undefined): boolean {
  if (!fonte) return false;
  const aliases = FONTE_FOLDERS[fonte] ?? [];
  const key = foldName(folderName);
  return aliases.some((a) => foldName(a) === key);
}

/** Candidatos: {home}\FINACAP\... e uma pasta abaixo (OneDrive). */
export function reportsCandidates(home = os.homedir()): string[] {
  const out: string[] = [];
  const add = (p: string) => {
    if (!out.includes(p)) out.push(p);
  };
  add(path.join(home, SELL_SIDE_RELATIVE));
  try {
    for (const e of fs.readdirSync(home, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const dir = path.join(home, e.name);
      add(path.join(dir, SELL_SIDE_RELATIVE));
      if (foldName(e.name).includes(foldName("FINACAP CONSULT FINANC MERC CAP LTDA"))) {
        add(
          path.join(
            dir,
            "Pesquisa - Documentos",
            "10_Dados_Primários",
            "Sell Side_Reports"
          )
        );
      }
    }
  } catch {
    // home inacessível — fica só o caminho direto
  }
  return out;
}

let cachedRoot: string | null = null;

export function reportsRoot(): string {
  const fromEnv = process.env.SELL_SIDE_REPORTS_DIR?.trim();
  if (fromEnv && existsDir(fromEnv)) return fromEnv;
  if (cachedRoot && existsDir(cachedRoot)) return cachedRoot;
  for (const c of reportsCandidates()) {
    if (existsDir(c)) {
      cachedRoot = c;
      return c;
    }
  }
  return fromEnv || path.join(os.homedir(), SELL_SIDE_RELATIVE);
}

function isInsideRoot(root: string, file: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(file));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function listFiles(dir: string, depth: number, out: string[]): void {
  if (depth < 0) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, depth - 1, out);
    else if (e.isFile()) out.push(full);
  }
}

/** Procura o PDF nas pastas de banco em Sell Side_Reports (só no Node local). */
export function findLocalPdf(opts: {
  fileName?: string | null;
  filePath?: string | null;
  fonte?: string | null;
}): string | null {
  const names = [
    pdfBaseName(opts.fileName, null),
    pdfBaseName(null, opts.filePath),
  ].filter((n, i, arr): n is string => !!n && arr.indexOf(n) === i);
  if (names.length === 0) return null;
  const root = reportsRoot();
  if (!fs.existsSync(root)) return null;

  let dirs: fs.Dirent[] = [];
  try {
    dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return null;
  }
  const ordered = [
    ...dirs.filter((d) => isPreferredFolder(d.name, opts.fonte)),
    ...dirs.filter((d) => !isPreferredFolder(d.name, opts.fonte)),
  ];

  const scan = (dir: string, want: string): string | null => {
    const files: string[] = [];
    listFiles(dir, 4, files);
    const hit = files.find((f) => samePdfName(path.basename(f), want));
    if (!hit || !isInsideRoot(root, hit)) return null;
    return path.resolve(hit);
  };

  for (const want of names) {
    for (const d of ordered) {
      const hit = scan(path.join(root, d.name), want);
      if (hit) return hit;
    }
    const atRoot = scan(root, want);
    if (atRoot) return atRoot;
  }
  return null;
}
