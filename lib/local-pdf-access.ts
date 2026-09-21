"use client";

import { pdfNamesToTry, samePdfName } from "@/lib/pdf-name";

const DB_NAME = "finacap-pdf";
const STORE = "handles";
const HANDLE_KEY = "sell-side";

const FOLDER_HINT =
  "Na primeira vez, selecione a pasta Sell Side_Reports:\nPesquisa - Documentos → 10_Dados_Primários → Sell Side_Reports\n(não use a pasta Documentos)";

type DirHandle = FileSystemDirectoryHandle & {
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  queryPermission?: (d: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "read" }) => Promise<PermissionState>;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadHandle(): Promise<DirHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(HANDLE_KEY);
    req.onsuccess = () => resolve((req.result as DirHandle | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle: DirHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function ensureRead(handle: DirHandle): Promise<boolean> {
  try {
    const q = handle.queryPermission ? await handle.queryPermission({ mode: "read" }) : "granted";
    if (q === "granted") return true;
    const r = handle.requestPermission
      ? await handle.requestPermission({ mode: "read" })
      : "denied";
    return r === "granted";
  } catch {
    return false;
  }
}

async function pickFolder(): Promise<DirHandle> {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (opts: { id: string; mode: "read" }) => Promise<DirHandle>;
    }
  ).showDirectoryPicker;
  if (!picker) {
    throw new Error("Use Chrome ou Edge para abrir os PDFs da pasta local.");
  }
  return picker({ id: "finacap-sell-side", mode: "read" });
}

async function findFile(dir: DirHandle, want: string, depth: number): Promise<File | null> {
  if (depth < 0) return null;
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === "file" && samePdfName(name, want)) {
      return (handle as FileSystemFileHandle).getFile();
    }
    if (handle.kind === "directory") {
      const hit = await findFile(handle as DirHandle, want, depth - 1);
      if (hit) return hit;
    }
  }
  return null;
}

async function savedFolder(): Promise<DirHandle | null> {
  const saved = await loadHandle();
  if (saved && (await ensureRead(saved))) return saved;
  return null;
}

async function searchNames(dir: DirHandle, names: string[]): Promise<File | null> {
  for (const n of names) {
    const file = await findFile(dir, n, 6);
    if (file) return file;
  }
  return null;
}

function openBlob(file: File): void {
  window.open(URL.createObjectURL(file), "_blank", "noopener,noreferrer");
}

/** Se o servidor local achar o arquivo, abre sem seletor. */
export async function tryOpenServerPdf(pdfId: number): Promise<boolean> {
  const res = await fetch(`/api/revisions/pdf?pdf_id=${pdfId}`, { cache: "no-store" });
  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok || !ct.includes("pdf")) return false;
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  return true;
}

/** Abre o PDF da pasta OneDrive já autorizada; pede a pasta só se ainda não houver. */
export async function openLocalPdf(
  fileName?: string | null,
  filePath?: string | null
): Promise<void> {
  const names = pdfNamesToTry(fileName, filePath);
  if (names.length === 0) throw new Error("Este registro não tem nome de PDF.");

  let dir = await savedFolder();
  if (!dir) {
    window.alert(FOLDER_HINT);
    dir = await pickFolder();
    await saveHandle(dir);
  }

  let file = await searchNames(dir, names);
  if (!file) {
    const again = window.confirm(
      `Não achei ${names.join(" / ")} nessa pasta.\n\nSelecionar Sell Side_Reports agora?`
    );
    if (!again) return;
    dir = await pickFolder();
    await saveHandle(dir);
    file = await searchNames(dir, names);
  }
  if (!file) {
    throw new Error(
      `Não achei ${names.join(" / ")}. A pasta certa é Sell Side_Reports (btg, bradesco, itaú, safra).`
    );
  }
  openBlob(file);
}
