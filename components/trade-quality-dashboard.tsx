"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateShort, formatNumber, formatValue } from "@/lib/format";
import { recomputeRotationPair, summaryStats, type RotationRow } from "@/lib/trade-analytics";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

type DayExecution = {
  ric: string;
  tradeDateIso: string;
  tradingDesk: string;
  side: "buy" | "sell";
  qty: number;
  avgPrice: number;
  notional: number;
  tradeCount: number;
  book: string;
  trader: string;
  marketClose: number | null;
  marketTypical: number | null;
  vsCloseBps: number | null;
  vsTypicalBps: number | null;
  vsCloseValue: number | null;
  vsTypicalValue: number | null;
  quality: "good" | "neutral" | "poor" | "unknown";
};

type TradesPayload = {
  fromIso: string;
  toIso: string;
  tradingDesks: string[];
  executions: DayExecution[];
  rotations: RotationRow[];
  summary: {
    total: number;
    scored: number;
    good: number;
    poor: number;
    neutral: number;
    avgBps: number | null;
    buyNotional: number;
    sellNotional: number;
    totalVsTypicalValue: number | null;
  };
};

const PERIOD_OPTIONS = [
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "180", label: "180d" },
  { value: "365", label: "1a" },
] as const;

const DEFAULT_PERIOD_DAYS = "30";

function todayIso(ref = new Date()): string {
  const d = ref;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoDaysAgo(n: number, ref = new Date()): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Padrão: 1º dia do mês corrente até hoje. */
function defaultMonthRange(ref = new Date()): { from: string; to: string } {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, "0");
  return { from: `${y}-${m}-01`, to: todayIso(ref) };
}

function periodDateRange(days: string): { from: string; to: string } {
  const n = Number(days);
  if (days === DEFAULT_PERIOD_DAYS) return defaultMonthRange();
  return { from: isoDaysAgo(n), to: todayIso() };
}

/** Preço médio negociado, fechamento e média do dia — mesma tipografia. */
const PRICE_COL = "text-center tabular text-sm text-ink";
const PRICE_HEAD = "text-center text-surface-soft/90";
const CELL_CENTER = "text-center";

function fmtBps(v: number | null): string {
  if (v == null) return "–";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, 1)} bps`;
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "–";
  return formatValue(v, "money", "R$");
}

function fmtMoneySigned(v: number | null): string {
  if (v == null) return "–";
  const formatted = formatValue(Math.abs(v), "money", "R$");
  if (v > 0) return `+${formatted}`;
  if (v < 0) return `-${formatted}`;
  return formatted;
}

function fmtPct(v: number | null): string {
  if (v == null) return "–";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, 2)}%`;
}

function QualityBadge({ q }: { q: DayExecution["quality"] }) {
  const map = {
    good: "bg-brand/10 text-brand border-brand/25",
    poor: "bg-destructive/10 text-destructive border-destructive/25",
    neutral: "bg-surface text-ink/70 border-line",
    unknown: "bg-surface-soft text-ink/40 border-line",
  } as const;
  const labels = { good: "Bom", poor: "Ruim", neutral: "Neutro", unknown: "N/D" };
  return (
    <Badge variant="outline" className={cn("font-medium text-[10px] uppercase tracking-wide", map[q])}>
      {labels[q]}
    </Badge>
  );
}

function inDateRange(iso: string, from: string, to: string): boolean {
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition",
        active ? "bg-navy text-surface-soft" : "text-ink/60 hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

export function TradeQualityDashboard() {
  const initialRange = React.useMemo(() => defaultMonthRange(), []);
  const [days, setDays] = React.useState(DEFAULT_PERIOD_DAYS);
  const [desk, setDesk] = React.useState<string>("all");
  const [dateFrom, setDateFrom] = React.useState(initialRange.from);
  const [dateTo, setDateTo] = React.useState(initialRange.to);
  const [data, setData] = React.useState<TradesPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pairOverrides, setPairOverrides] = React.useState<
    Record<string, { shortLeg: string; longLeg: string }>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trades?days=${days}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as TradesPayload & { error?: string };
        if (json.error) throw new Error(json.error);
        if (!cancelled) {
          setData({
            ...json,
            rotations: json.rotations ?? [],
          });
          setDesk("all");
          const range = periodDateRange(days);
          setDateFrom(range.from);
          setDateTo(range.to);
          setPairOverrides({});
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const filteredExecutions = React.useMemo(() => {
    if (!data) return [];
    return data.executions.filter((ex) => {
      if (desk !== "all" && ex.tradingDesk !== desk) return false;
      if (!inDateRange(ex.tradeDateIso, dateFrom, dateTo)) return false;
      return true;
    });
  }, [data, desk, dateFrom, dateTo]);

  const filteredRotations = React.useMemo(() => {
    if (!data) return [];
    return data.rotations.filter((p) => {
      if (desk !== "all" && p.tradingDesk !== desk) return false;
      if (!inDateRange(p.tradeDateIso, dateFrom, dateTo)) return false;
      return true;
    });
  }, [data, desk, dateFrom, dateTo]);

  const updatePairOverride = React.useCallback(
    (pairId: string, patch: Partial<{ shortLeg: string; longLeg: string }>) => {
      setPairOverrides((prev) => {
        const row = data?.rotations.find((r) => r.pairId === pairId);
        if (!row) return prev;
        const current = prev[pairId] ?? { shortLeg: row.shortLeg, longLeg: row.longLeg };
        return { ...prev, [pairId]: { ...current, ...patch } };
      });
    },
    [data]
  );

  const filteredSummary = React.useMemo(
    () => summaryStats(filteredExecutions),
    [filteredExecutions]
  );

  const hasFilters =
    desk !== "all" ||
    dateFrom !== initialRange.from ||
    dateTo !== initialRange.to ||
    days !== DEFAULT_PERIOD_DAYS;

  const applyPeriod = (value: string) => {
    setDays(value);
    const range = periodDateRange(value);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const clearFilters = () => {
    setDesk("all");
    setDays(DEFAULT_PERIOD_DAYS);
    const range = defaultMonthRange();
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-soft">
      <AppHeader
        active="trades"
        subtitle="Execução"
        lastUpdate={data?.toIso}
      />

      {/* Barra de filtros */}
      <div className="bg-surface-soft border-b border-line sticky top-16 z-30">
        <div className="mx-auto max-w-[1600px] px-8 py-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md bg-surface p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <FilterPill
                key={opt.value}
                label={opt.label}
                active={days === opt.value}
                onClick={() => applyPeriod(opt.value)}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-line hidden sm:block" />

          <Select value={desk} onValueChange={setDesk}>
            <SelectTrigger className="w-[200px] h-8 text-xs bg-surface border-line">
              <SelectValue placeholder="Trading desk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os desks</SelectItem>
              {(data?.tradingDesks ?? []).map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink/50 uppercase tracking-wide">De</span>
            <Input
              type="date"
              value={dateFrom}
              min={data?.fromIso}
              max={dateTo || data?.toIso}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[132px] h-8 text-xs bg-surface border-line tabular"
            />
            <span className="text-[11px] text-ink/50 uppercase tracking-wide">Até</span>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || data?.fromIso}
              max={data?.toIso}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[132px] h-8 text-xs bg-surface border-line tabular"
            />
          </div>

          <div className="flex-1" />

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-ink/60 hover:text-brand underline-offset-4 hover:underline transition"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-8 py-6 space-y-6 flex-1 w-full">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Summary cards — estilo Research */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 [&>*]:min-w-0">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-[76px] rounded-md" />
              ))
            : (
              <>
                <SummaryCard label="Execuções" value={formatNumber(filteredSummary.total)} />
                <SummaryCard
                  label="Qualidade média"
                  value={fmtBps(filteredSummary.avgBps)}
                  hint="vs média (H+L+C)/3"
                />
                <SummaryCard
                  label="Boas"
                  value={formatNumber(filteredSummary.good)}
                  icon={<TrendingUp className="w-3.5 h-3.5 text-brand" />}
                />
                <SummaryCard
                  label="Ruins"
                  value={formatNumber(filteredSummary.poor)}
                  icon={<TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                />
                <SummaryCard
                  label="Comprado"
                  value={fmtMoney(filteredSummary.buyNotional)}
                  hint="volume financeiro"
                />
                <SummaryCard
                  label="Vendido"
                  value={fmtMoney(filteredSummary.sellNotional)}
                  hint="volume financeiro"
                />
                <SummaryCard
                  label="Resultado vs média"
                  value={fmtMoneySigned(filteredSummary.totalVsTypicalValue)}
                  hint="lucro/prejuízo estimado"
                />
              </>
            )}
        </div>

        {/* Tabela execuções */}
        <section className="rounded-md border border-line bg-surface-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-surface">
            <h2 className="font-display text-[15px] text-ink">Execuções intraday</h2>
            <p className="text-[11px] text-ink/50 mt-0.5">
              <span className="text-ink/65">Preço médio negociado</span> = sua execução ·{" "}
              <span className="text-ink/65">Fechamento</span> = último do pregão ·{" "}
              <span className="text-ink/65">Média do dia</span> = (máx + mín + fech) ÷ 3
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-thin max-h-[460px]">
            <Table>
              <TableHeader className="sticky top-0 z-[1]">
                <TableRow className="bg-navy hover:bg-navy border-none">
                  {[
                    "Data",
                    "Desk",
                    "Papel",
                    "Lado",
                    "Qtd",
                    "Valor",
                    "Preço médio negociado",
                    "Fechamento",
                    "Média do dia",
                    "vs média",
                    "Resultado",
                    "vs close",
                    "Qualidade",
                    "Book",
                  ].map((h, i) => (
                      <TableHead
                        key={h}
                        className={cn(
                          "text-[9px] uppercase tracking-[0.14em] font-medium h-9 text-center",
                          i >= 6 && i <= 8 ? PRICE_HEAD : "text-surface-soft/80"
                        )}
                      >
                        {h}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="py-8">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ) : filteredExecutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-ink/50 py-10 text-sm">
                      Nenhuma execução no período / filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExecutions.map((ex, i) => (
                    <TableRow
                      key={`${ex.tradeDateIso}-${ex.tradingDesk}-${ex.ric}-${ex.side}`}
                      className={cn("border-line", i % 2 === 0 ? "bg-surface-soft" : "bg-white")}
                    >
                      <TableCell className={cn(CELL_CENTER, "tabular text-xs whitespace-nowrap text-ink/70")}>
                        {formatDateShort(ex.tradeDateIso)}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "text-[11px] text-ink/55 max-w-[120px] truncate")}>
                        {ex.tradingDesk}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "font-medium text-ink tabular")}>{ex.ric}</TableCell>
                      <TableCell className={CELL_CENTER}>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase tracking-wide font-medium",
                            ex.side === "buy"
                              ? "border-brand/40 text-brand bg-brand/5"
                              : "border-ink/20 text-ink/70 bg-surface"
                          )}
                        >
                          {ex.side === "buy" ? "Compra" : "Venda"}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "tabular text-sm text-ink")}>
                        {formatNumber(ex.qty, 0)}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "tabular text-sm text-ink font-medium")}>
                        {fmtMoney(ex.notional)}
                      </TableCell>
                      <TableCell className={PRICE_COL}>{formatNumber(ex.avgPrice, 2)}</TableCell>
                      <TableCell className={PRICE_COL}>
                        {ex.marketClose != null ? formatNumber(ex.marketClose, 2) : "–"}
                      </TableCell>
                      <TableCell className={PRICE_COL}>
                        {ex.marketTypical != null ? formatNumber(ex.marketTypical, 2) : "–"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          CELL_CENTER,
                          "tabular text-sm font-medium",
                          (ex.vsTypicalBps ?? 0) >= 5 && "text-brand",
                          (ex.vsTypicalBps ?? 0) <= -5 && "text-destructive"
                        )}
                      >
                        {fmtBps(ex.vsTypicalBps)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          CELL_CENTER,
                          "tabular text-sm font-medium",
                          (ex.vsTypicalValue ?? 0) > 0 && "text-brand",
                          (ex.vsTypicalValue ?? 0) < 0 && "text-destructive"
                        )}
                      >
                        {fmtMoneySigned(ex.vsTypicalValue)}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "tabular text-sm text-ink/60")}>
                        {fmtBps(ex.vsCloseBps)}
                      </TableCell>
                      <TableCell className={CELL_CENTER}>
                        <QualityBadge q={ex.quality} />
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "text-[11px] text-ink/45 max-w-[130px] truncate")}>
                        {ex.book}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Tabela rotações */}
        <section className="rounded-md border border-line bg-surface-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-surface">
            <h2 className="font-display text-[15px] text-ink">Rotações (long/short sintético)</h2>
            <p className="text-[11px] text-ink/50 mt-0.5">
              Pares no mesmo dia e desk · ajuste venda/compra nos selects · retorno ponderado vs IBOV
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-navy hover:bg-navy border-none">
                  {[
                    "Data",
                    "Desk",
                    "Venda (sint.)",
                    "Compra (long)",
                    "Ret. long",
                    "Ret. short",
                    "Ret. par",
                    "IBOV",
                    "Alpha",
                    "Até",
                  ].map((h, i) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "text-[9px] uppercase tracking-[0.14em] text-surface-soft/80 font-medium h-9",
                        i >= 4 && "text-right"
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ) : filteredRotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-ink/50 py-10 text-sm">
                      Nenhum par de rotação no período / filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRotations.map((row, i) => {
                    const override = pairOverrides[row.pairId];
                    const shortLeg = override?.shortLeg ?? row.shortLeg;
                    const longLeg = override?.longLeg ?? row.longLeg;
                    const metrics = recomputeRotationPair(row, shortLeg, longLeg);

                    return (
                    <TableRow
                      key={row.pairId}
                      className={cn("border-line", i % 2 === 0 ? "bg-surface-soft" : "bg-white")}
                    >
                      <TableCell className={cn(CELL_CENTER, "tabular text-xs text-ink/70")}>
                        {formatDateShort(row.tradeDateIso)}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "text-[11px] text-ink/55 max-w-[120px] truncate")}>
                        {row.tradingDesk}
                      </TableCell>
                      <TableCell className={CELL_CENTER}>
                        <Select
                          value={shortLeg}
                          onValueChange={(v) => updatePairOverride(row.pairId, { shortLeg: v })}
                        >
                          <SelectTrigger className="h-7 w-[96px] mx-auto text-xs font-medium tabular border-line bg-surface">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {row.sellOptions.map((o) => (
                              <SelectItem key={o.ric} value={o.ric} className="text-xs tabular">
                                {o.ric}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={CELL_CENTER}>
                        <Select
                          value={longLeg}
                          onValueChange={(v) => updatePairOverride(row.pairId, { longLeg: v })}
                        >
                          <SelectTrigger className="h-7 w-[96px] mx-auto text-xs font-medium tabular border-line bg-surface text-brand">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {row.buyOptions.map((o) => (
                              <SelectItem key={o.ric} value={o.ric} className="text-xs tabular">
                                {o.ric}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "tabular text-sm")}>
                        {fmtPct(metrics.longReturnPct)}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "tabular text-sm")}>
                        {fmtPct(metrics.shortReturnPct)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          CELL_CENTER,
                          "tabular text-sm font-semibold",
                          (metrics.pairReturnPct ?? 0) > 0 && "text-brand",
                          (metrics.pairReturnPct ?? 0) < 0 && "text-destructive"
                        )}
                      >
                        {fmtPct(metrics.pairReturnPct)}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "tabular text-sm text-ink/50")}>
                        {fmtPct(row.ibovReturnPct)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          CELL_CENTER,
                          "tabular text-sm font-medium",
                          (metrics.alphaVsIbovPct ?? 0) > 0 && "text-brand",
                          (metrics.alphaVsIbovPct ?? 0) < 0 && "text-destructive"
                        )}
                      >
                        {fmtPct(metrics.alphaVsIbovPct)}
                      </TableCell>
                      <TableCell className={cn(CELL_CENTER, "tabular text-[11px] text-ink/45")}>
                        {row.asOfDate ? formatDateShort(row.asOfDate) : "–"}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-surface-soft px-4 py-3 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[9px] uppercase tracking-[0.16em] text-ink/55 font-medium truncate">
          {label}
        </div>
        {icon ?? <div className="w-3.5 h-3.5 shrink-0" />}
      </div>
      <div className="mt-1.5 min-h-[1.5rem] font-display text-xl text-ink tabular leading-tight">
        {value}
      </div>
      {hint ? (
        <p className="text-[10px] text-ink/40 mt-1.5 truncate">{hint}</p>
      ) : (
        <p className="text-[10px] mt-1.5 invisible" aria-hidden>
          —
        </p>
      )}
    </div>
  );
}
