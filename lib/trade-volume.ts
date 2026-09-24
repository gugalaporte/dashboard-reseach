/** Volume financeiro — barras diárias, mensais ou anuais. */

export type VolumeGrain = "day" | "month" | "year";

export type VolumeBar = {
  key: string;
  label: string;
  adtv: number;
  totalNotional: number;
  sessionCount: number;
  partial: boolean;
};

export function volumePeakKey(bars: VolumeBar[]): string | null {
  const active = bars.filter((b) => b.totalNotional > 0);
  if (active.length === 0) return null;
  let peak = active[0]!;
  for (const b of active) {
    if (b.totalNotional > peak.totalNotional) peak = b;
  }
  return peak.key;
}

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Primeiro dia do mês, N meses antes (23 → janela de 24 meses). */
export const VOLUME_CHART_FROM = "2024-11-01";

export function monthsAgoStart(iso: string, months: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return iso.slice(0, 10);
  const d = new Date(y, m - 1 - months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** 24 meses até a data, sem out/24. */
export function volumeChartFrom(toIso: string): string {
  const start = monthsAgoStart(toIso, 23);
  return start < VOLUME_CHART_FROM ? VOLUME_CHART_FROM : start;
}

export function pickVolumeGrain(fromIso: string, toIso: string): VolumeGrain {
  const from = Date.parse(`${fromIso.slice(0, 10)}T12:00:00`);
  const to = Date.parse(`${toIso.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return "month";
  const days = (to - from) / 86_400_000;
  if (days <= 45) return "day";
  return days >= 800 ? "year" : "month";
}

function bucketKey(iso: string, grain: VolumeGrain): string | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  if (grain === "year") return iso.slice(0, 4);
  if (grain === "month") return iso.slice(0, 7);
  return iso.slice(0, 10);
}

export function volumeBarLabel(key: string): string {
  if (/^\d{4}$/.test(key)) return key;
  const day = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return `${day[3]}/${day[2]}`;
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  const month = Number(m[2]);
  const name = MONTH_SHORT[month - 1] ?? m[2];
  return `${name}/${m[1].slice(2)}`;
}

function isPartialBucket(key: string, grain: VolumeGrain, asOfIso: string): boolean {
  const asOf = asOfIso.slice(0, 10);
  if (grain === "day") return false;
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

  if (grain === "day") {
    const out: string[] = [];
    let cur = from;
    while (cur <= to) {
      out.push(cur);
      cur = addDaysIso(cur, 1);
    }
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
  range?: { fromIso: string; toIso: string },
  axisKeys?: string[]
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

  const keys = axisKeys?.length
    ? axisKeys
    : grain === "day"
      ? [...map.keys()]
          .filter((k) => {
            if (!range) return true;
            const a = range.fromIso.slice(0, 10);
            const b = range.toIso.slice(0, 10);
            return k >= a && k <= b;
          })
          .sort((a, b) => a.localeCompare(b))
      : range
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
    n <= 1 ? 1
    : n <= 2 ? 2
    : n <= 2.5 ? 2.5
    : n <= 4 ? 4
    : n <= 5 ? 5
    : n <= 6 ? 6
    : n <= 8 ? 8
    : 10;
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
  if (grain === "day") return null;
  if (grain === "year") {
    return `${last.key} considera até o último pregão do período`;
  }
  return `${last.label} considera até o último pregão do período`;
}
