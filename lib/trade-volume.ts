/** Volume financeiro das execuções — barras mensais ou anuais. */

export type VolumeGrain = "month" | "year";

export type VolumeBar = {
  key: string;
  label: string;
  adtv: number;
  totalNotional: number;
  sessionCount: number;
  partial: boolean;
};

export type VolumeHeadline = {
  title: string;
  subtitle: string;
  peakKey: string | null;
  vsPeakPct: number | null;
};

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function pickVolumeGrain(fromIso: string, toIso: string): VolumeGrain {
  const from = Date.parse(`${fromIso.slice(0, 10)}T12:00:00`);
  const to = Date.parse(`${toIso.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return "month";
  const days = (to - from) / 86_400_000;
  return days >= 800 ? "year" : "month";
}

function bucketKey(iso: string, grain: VolumeGrain): string | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  return grain === "year" ? iso.slice(0, 4) : iso.slice(0, 7);
}

export function volumeBarLabel(key: string): string {
  if (/^\d{4}$/.test(key)) return key;
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  const month = Number(m[2]);
  const name = MONTH_SHORT[month - 1] ?? m[2];
  return `${name}/${m[1].slice(2)}`;
}

function isPartialBucket(key: string, grain: VolumeGrain, asOfIso: string): boolean {
  const asOf = asOfIso.slice(0, 10);
  if (grain === "year") {
    return key === asOf.slice(0, 4) && asOf.slice(5, 7) !== "12";
  }
  return key === asOf.slice(0, 7);
}

/** Chaves contínuas de fromIso até toIso (mês ou ano). */
export function rangeKeys(fromIso: string, toIso: string, grain: VolumeGrain): string[] {
  const from = fromIso.slice(0, 10);
  const to = toIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return [];
  if (from > to) return [];

  if (grain === "year") {
    const y0 = Number(from.slice(0, 4));
    const y1 = Number(to.slice(0, 4));
    const out: string[] = [];
    for (let y = y0; y <= y1; y++) out.push(String(y));
    return out;
  }

  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  const out: string[] = [];
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Volume total do bucket; preenche meses/anos vazios do intervalo. */
export function buildVolumeBars(
  executions: Array<{ tradeDateIso: string; notional: number }>,
  grain: VolumeGrain,
  asOfIso: string,
  range?: { fromIso: string; toIso: string }
): VolumeBar[] {
  const map = new Map<string, { notional: number; days: Set<string> }>();

  for (const ex of executions) {
    const key = bucketKey(ex.tradeDateIso, grain);
    if (!key) continue;
    if (!Number.isFinite(ex.notional) || ex.notional <= 0) continue;
    const cur = map.get(key) ?? { notional: 0, days: new Set<string>() };
    cur.notional += ex.notional;
    cur.days.add(ex.tradeDateIso.slice(0, 10));
    map.set(key, cur);
  }

  const keys = range
    ? rangeKeys(range.fromIso, range.toIso, grain)
    : [...map.keys()].sort((a, b) => a.localeCompare(b));

  return keys.map((key) => {
    const cur = map.get(key);
    const sessionCount = cur?.days.size ?? 0;
    const totalNotional = cur?.notional ?? 0;
    return {
      key,
      label: volumeBarLabel(key),
      adtv: sessionCount > 0 ? totalNotional / sessionCount : 0,
      totalNotional,
      sessionCount,
      partial: isPartialBucket(key, grain, asOfIso),
    };
  });
}

export function volumeHeadline(bars: VolumeBar[]): VolumeHeadline {
  const empty: VolumeHeadline = {
    title: "Volume de execução",
    subtitle: "Sem execuções no período selecionado",
    peakKey: null,
    vsPeakPct: null,
  };
  const active = bars.filter((b) => b.totalNotional > 0);
  if (active.length === 0) return empty;

  let peak = active[0]!;
  for (const b of active) {
    if (b.totalNotional > peak.totalNotional) peak = b;
  }
  const latest = active[active.length - 1]!;
  if (peak.totalNotional <= 0) return empty;

  if (latest.key === peak.key || latest.totalNotional >= peak.totalNotional * 0.995) {
    return {
      title: "Volume de execução no recorde do período",
      subtitle: "O volume financeiro está no maior nível da janela selecionada",
      peakKey: peak.key,
      vsPeakPct: 0,
    };
  }

  const belowPct = ((peak.totalNotional - latest.totalNotional) / peak.totalNotional) * 100;
  const rounded = Math.round(belowPct);
  return {
    title: "Volume de execução segue abaixo do pico",
    subtitle: `O volume financeiro ainda está cerca de ${rounded}% abaixo do recorde de ${peak.label}`,
    peakKey: peak.key,
    vsPeakPct: belowPct,
  };
}

export type VolumeAxis = {
  divisor: number;
  suffix: string;
  max: number;
};

/** Escala do eixo Y (bi / mi / mil, teto redondo). */
export function volumeAxis(maxValue: number): VolumeAxis {
  const raw = maxValue > 0 ? maxValue : 1;
  const divisor = raw >= 1e9 ? 1e9 : raw >= 1e6 ? 1e6 : raw >= 1e3 ? 1e3 : 1;
  const suffix = divisor === 1e9 ? "bi" : divisor === 1e6 ? "mi" : divisor === 1e3 ? "mil" : "";
  const scaled = raw / divisor;
  const pow = 10 ** Math.floor(Math.log10(scaled));
  const n = scaled / pow;
  const nice =
    n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return { divisor, suffix, max: nice * pow };
}

export function formatAdtv(value: number, axis: VolumeAxis, digits = 1): string {
  return formatVolume(value, axis, digits);
}

export function formatVolume(value: number, axis: VolumeAxis, digits = 1): string {
  const n = value / axis.divisor;
  const body = n.toLocaleString("pt-BR", {
    minimumFractionDigits: axis.divisor === 1 ? 0 : digits,
    maximumFractionDigits: axis.divisor === 1 ? 0 : digits,
  });
  if (axis.suffix) return `R$ ${body} ${axis.suffix}`;
  return `R$ ${body}`;
}

/** Rótulo curto no topo da barra. */
export function formatBarLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const axis = volumeAxis(value);
  const n = value / axis.divisor;
  const digits = n >= 10 || axis.divisor === 1 ? 0 : 1;
  const body = n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (axis.suffix) return `${body} ${axis.suffix}`;
  return body;
}

export function partialNote(bars: VolumeBar[], grain: VolumeGrain): string | null {
  const last = bars.at(-1);
  if (!last?.partial) return null;
  if (grain === "year") {
    return `${last.key} considera as médias até o último pregão com execução`;
  }
  return `${last.label} considera as médias até o último pregão com execução`;
}
