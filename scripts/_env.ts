// Loader minimo de .env para scripts (sem depender de dotenv).
// Procura o arquivo em ordem: ./env, ../.env (raiz do workspace), ../../.env.
// Se uma chave ja estiver em process.env, NAO sobrescreve.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnv(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), "../../.env"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (process.env[key] == null) process.env[key] = value;
    }
  }
}
