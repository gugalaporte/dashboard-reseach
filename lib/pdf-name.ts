/** Nome de arquivo PDF — puro, usado no client e no server. */

export function foldName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function pdfBaseName(
  fileName: string | null | undefined,
  filePath: string | null | undefined
): string | null {
  const raw = (fileName?.trim() || filePath?.trim() || "").replace(/\\/g, "/");
  if (!raw) return null;
  const parts = raw.split("/").filter(Boolean);
  const base = parts[parts.length - 1] ?? "";
  if (!base || base === "." || base === "..") return null;
  if (base.includes("..")) return null;
  return base;
}

export function samePdfName(a: string, b: string): boolean {
  return foldName(a) === foldName(b);
}

export function pdfNamesToTry(
  fileName: string | null | undefined,
  filePath: string | null | undefined
): string[] {
  return [pdfBaseName(fileName, null), pdfBaseName(null, filePath)].filter(
    (n, i, arr): n is string => !!n && arr.indexOf(n) === i
  );
}
