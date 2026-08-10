"use client";

import * as React from "react";
import { AppHeader } from "@/components/app-header";
import { SectorFilter } from "@/components/sector-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { sectorPt } from "@/lib/sector-labels";
import {
  DEFAULT_ELIGIBILITY,
  type FactorClass,
  type FactorRow,
} from "@/lib/factor-scoring";
import {
  CompositeScoreCell,
  FactorScoreCell,
} from "@/components/factor-cell-tip";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type FactorPayload = {
  asOfDate: string | null;
  eligibility: { minDayVolume: number; maxNetDebtEbitda: number };
  rows: FactorRow[];
  sectors: string[];
};

type SortKey =
  | "score"
  | "quality"
  | "value"
  | "momentum"
  | "carry"
  | "liquidity"
  | "ticker";

function ClassBadge({ c }: { c: FactorClass | null }) {
  if (!c) return <span className="text-ink/30">–</span>;
  const styles = {
    A: "bg-brand/10 text-brand border-brand/30",
    B: "bg-surface text-ink/70 border-line",
    C: "bg-destructive/10 text-destructive border-destructive/25",
  } as const;
  return (
    <Badge variant="outline" className={cn("font-semibold tabular text-[11px]", styles[c])}>
      {c}
    </Badge>
  );
}

function fmtZ(v: number | null): string {
  if (v == null) return "–";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, 2)}`;
}

/** Valor bruto compacto para o painel (market cap / volume grandes). */
function fmtRaw(key: string, v: number | null): string {
  if (v == null) return "–";
  if (key === "marketCap" || key === "dayVolume") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${formatNumber(v / 1e9, 2)} bi`;
    if (abs >= 1e6) return `${formatNumber(v / 1e6, 1)} mi`;
    return formatNumber(v, 0);
  }
  return formatNumber(v, 2);
}

function SortHead({
  label,
  active,
  dir,
  onClick,
  align = "center",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "center" | "right";
}) {
  return (
    <TableHead
      className={cn(
        "text-[9px] uppercase tracking-[0.14em] font-medium h-9 cursor-pointer select-none text-surface-soft/80 hover:text-surface-soft",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
      onClick={onClick}
    >
      {label}
      {active ? (dir === "desc" ? " ↓" : " ↑") : ""}
    </TableHead>
  );
}

export function FactorInvestingDashboard() {
  const [data, setData] = React.useState<FactorPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [setor, setSetor] = React.useState<string | undefined>();
  const [classFilter, setClassFilter] = React.useState<FactorClass | "all">("all");
  const [onlyEligible, setOnlyEligible] = React.useState(true);
  const [onlyPortfolio, setOnlyPortfolio] = React.useState(false);
  const [minVol, setMinVol] = React.useState(String(DEFAULT_ELIGIBILITY.minDayVolume));
  const [maxNd, setMaxNd] = React.useState(String(DEFAULT_ELIGIBILITY.maxNetDebtEbitda));
  const [sortKey, setSortKey] = React.useState<SortKey>("score");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [selected, setSelected] = React.useState<FactorRow | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        minDayVolume: String(Number(minVol) || DEFAULT_ELIGIBILITY.minDayVolume),
        maxNetDebtEbitda: String(Number(maxNd) || DEFAULT_ELIGIBILITY.maxNetDebtEbitda),
      });
      const res = await fetch(`/api/factors?${params}`, { cache: "no-store" });
      const json = (await res.json()) as FactorPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [minVol, maxNd]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir(key === "ticker" ? "asc" : "desc");
    }
  };

  const rows = React.useMemo(() => {
    if (!data) return [];
    let list = data.rows;
    if (onlyEligible) list = list.filter((r) => r.eligible);
    if (onlyPortfolio) list = list.filter((r) => r.inPortfolio);
    if (setor) list = list.filter((r) => r.sector === setor);
    if (classFilter !== "all") list = list.filter((r) => r.factorClass === classFilter);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "ticker") return dir * a.ticker.localeCompare(b.ticker);
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return a.ticker.localeCompare(b.ticker);
      if (av == null) return 1;
      if (bv == null) return -1;
      return dir * (Number(av) - Number(bv));
    });
  }, [data, onlyEligible, onlyPortfolio, setor, classFilter, sortKey, sortDir]);

  const counts = React.useMemo(() => {
    const eligible = data?.rows.filter((r) => r.eligible) ?? [];
    return {
      total: eligible.length,
      A: eligible.filter((r) => r.factorClass === "A").length,
      B: eligible.filter((r) => r.factorClass === "B").length,
      C: eligible.filter((r) => r.factorClass === "C").length,
    };
  }, [data]);

  const hasFilters =
    setor !== undefined ||
    classFilter !== "all" ||
    !onlyEligible ||
    onlyPortfolio ||
    minVol !== String(DEFAULT_ELIGIBILITY.minDayVolume) ||
    maxNd !== String(DEFAULT_ELIGIBILITY.maxNetDebtEbitda);

  function clearFilters() {
    setSetor(undefined);
    setClassFilter("all");
    setOnlyEligible(true);
    setOnlyPortfolio(false);
    setMinVol(String(DEFAULT_ELIGIBILITY.minDayVolume));
    setMaxNd(String(DEFAULT_ELIGIBILITY.maxNetDebtEbitda));
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        active="factors"
        subtitle="Screening"
        lastUpdate={data?.asOfDate}
      />

      <div className="bg-surface-soft border-b border-line sticky top-16 z-30">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex flex-wrap items-center gap-2 md:gap-3">
          <SectorFilter
            options={data?.sectors ?? []}
            value={setor}
            onChange={setSetor}
          />
          <div className="h-6 w-px bg-line shrink-0" />
          <ClassFilter value={classFilter} onChange={setClassFilter} />
          <div className="h-6 w-px bg-line shrink-0" />
          <div className="flex items-center gap-1 rounded-md bg-surface p-1">
            <TogglePill
              active={onlyEligible}
              onClick={() => setOnlyEligible((v) => !v)}
              label="Só elegíveis"
            />
            <TogglePill
              active={onlyPortfolio}
              onClick={() => setOnlyPortfolio((v) => !v)}
              label="Em carteira"
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-ink/45">
            <span className="tabular">{counts.total} elegíveis</span>
            <span className="text-brand tabular">A {counts.A}</span>
            <span className="tabular">B {counts.B}</span>
            <span className="text-destructive tabular">C {counts.C}</span>
          </div>
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

        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pb-3 flex flex-wrap items-center gap-2 md:gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-medium shrink-0">
            Elegibilidade
          </span>
          <label className="flex items-center gap-2 text-xs text-ink/55">
            <span className="shrink-0">Vol. mín.</span>
            <Input
              className="h-8 w-[7.5rem] text-xs tabular border-line bg-surface"
              value={minVol}
              onChange={(e) => setMinVol(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-ink/55">
            <span className="shrink-0">ND/EBITDA máx.</span>
            <Input
              className="h-8 w-16 text-xs tabular border-line bg-surface"
              value={maxNd}
              onChange={(e) => setMaxNd(e.target.value)}
            />
          </label>
          <Button
            type="button"
            size="sm"
            className="h-8 text-[11px] uppercase tracking-[0.08em]"
            onClick={fetchData}
            disabled={loading}
          >
            Recalcular
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-5 md:py-8 space-y-5 md:space-y-6 flex-1">
        {error && (
          <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3">
            {error}
          </p>
        )}

        <section>
          <div className="mb-3">
            <h2 className="font-display text-lg text-ink tracking-tight">
              Screening multifatorial
            </h2>
            <p className="text-xs text-ink/45 mt-0.5">
              Quality 30% · Value 30% · Carry 30% · Momentum 10% — z-score por
              setor · ND/EBITDA ignore bancos/financeiras
            </p>
          </div>
          <div className="overflow-x-auto border border-line bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-navy hover:bg-navy border-none">
                  <SortHead label="Papel" active={sortKey === "ticker"} dir={sortDir} onClick={() => toggleSort("ticker")} align="left" />
                  <TableHead className="text-[9px] uppercase tracking-[0.14em] text-surface-soft/80 font-medium h-9 text-left">
                    Setor
                  </TableHead>
                  <SortHead label="Quality" active={sortKey === "quality"} dir={sortDir} onClick={() => toggleSort("quality")} />
                  <SortHead label="Value" active={sortKey === "value"} dir={sortDir} onClick={() => toggleSort("value")} />
                  <SortHead label="Momentum" active={sortKey === "momentum"} dir={sortDir} onClick={() => toggleSort("momentum")} />
                  <SortHead label="Carry" active={sortKey === "carry"} dir={sortDir} onClick={() => toggleSort("carry")} />
                  <SortHead label="Score" active={sortKey === "score"} dir={sortDir} onClick={() => toggleSort("score")} />
                  <TableHead className="text-[9px] uppercase tracking-[0.14em] text-surface-soft/80 font-medium h-9 text-center">
                    Classe
                  </TableHead>
                  {!onlyEligible && (
                    <TableHead className="text-[9px] uppercase tracking-[0.14em] text-surface-soft/80 font-medium h-9 text-left">
                      Motivo
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={onlyEligible ? 8 : 9} className="py-8">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={onlyEligible ? 8 : 9}
                      className="text-center text-ink/50 py-10 text-sm"
                    >
                      Nenhuma empresa no filtro atual.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow
                      key={r.ric}
                      className={cn(
                        "border-line cursor-pointer",
                        i % 2 === 0 ? "bg-surface-soft" : "bg-white",
                        "hover:bg-brand/5"
                      )}
                      onClick={() => setSelected(r)}
                    >
                      <TableCell className="font-medium text-ink tabular text-sm">
                        {r.ticker}
                        {r.inPortfolio && (
                          <span title="Em carteira" aria-label="Em carteira">
                            <Star className="inline ml-1 h-3 w-3 text-amber-500 fill-amber-400" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-ink/55 max-w-[140px] truncate">
                        {r.sector ? sectorPt(r.sector) : "–"}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <FactorScoreCell row={r} factor="quality" />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <FactorScoreCell row={r} factor="value" />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <FactorScoreCell row={r} factor="momentum" />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <FactorScoreCell row={r} factor="carry" />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <CompositeScoreCell row={r} />
                      </TableCell>
                      <TableCell className="text-center">
                        <ClassBadge c={r.factorClass} />
                      </TableCell>
                      {!onlyEligible && (
                        <TableCell className="text-[11px] text-ink/45 max-w-[180px] truncate">
                          {r.eligible ? (
                            <span className="text-ink/25">–</span>
                          ) : (
                            <span title={r.ineligibleReason ?? "Inelegível"}>
                              {r.ineligibleReason ?? "Inelegível"}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      <FactorDetailSheet row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition",
        active
          ? "bg-navy text-surface-soft"
          : "text-ink/60 hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

function ClassFilter({
  value,
  onChange,
}: {
  value: FactorClass | "all";
  onChange: (v: FactorClass | "all") => void;
}) {
  const options: Array<{ value: FactorClass | "all"; label: string }> = [
    { value: "all", label: "Todas" },
    { value: "A", label: "A" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md bg-surface p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition min-w-[2.25rem]",
            value === opt.value
              ? "bg-navy text-surface-soft"
              : "text-ink/60 hover:text-ink"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FactorDetailSheet({
  row,
  onClose,
}: {
  row: FactorRow | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-display text-xl">
            {row?.ticker}
            {row?.name ? (
              <span className="block text-sm font-sans font-normal text-ink/50 mt-1">
                {row.name}
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>
        {row && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Setor" value={row.sector ? sectorPt(row.sector) : "–"} />
              <Meta label="Classe" value={row.factorClass ?? "–"} />
              <Meta label="Score" value={fmtZ(row.score)} />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              {(
                [
                  ["Quality", row.quality],
                  ["Value", row.value],
                  ["Mom.", row.momentum],
                  ["Carry", row.carry],
                  ["Liq.", row.liquidity],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="border border-line bg-white px-2 py-3">
                  <div className="text-[9px] uppercase tracking-wide text-ink/40">{label}</div>
                  <div className="tabular text-sm font-semibold mt-1">{fmtZ(v)}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
                Breakdown das métricas
              </h3>
              {row.breakdown.length === 0 ? (
                <p className="text-sm text-ink/40">
                  {row.ineligibleReason ?? "Sem métricas (inelegível)."}
                </p>
              ) : (
                <div className="border border-line bg-white overflow-hidden">
                  <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_4.25rem] gap-x-4 px-4 py-2.5 border-b border-line bg-surface text-[9px] uppercase tracking-[0.14em] text-ink/45">
                    <span>Métrica</span>
                    <span className="text-right">Valor</span>
                    <span className="text-right">Z-score</span>
                  </div>
                  <ul>
                    {row.breakdown.map((m) => (
                      <li
                        key={m.key}
                        className="grid grid-cols-[minmax(0,1fr)_6.5rem_4.25rem] gap-x-4 items-center px-4 py-2.5 border-b border-line/60 last:border-b-0 text-sm"
                      >
                        <span className="text-ink/70 truncate min-w-0" title={m.label}>
                          {m.label}
                          {m.inverted ? (
                            <span className="text-[10px] text-ink/35 ml-1">(inv.)</span>
                          ) : null}
                        </span>
                        <span className="tabular text-ink/55 text-xs text-right whitespace-nowrap">
                          {fmtRaw(m.key, m.raw)}
                        </span>
                        <span className="tabular font-medium text-right whitespace-nowrap">
                          {fmtZ(m.z)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-white px-3 py-2">
      <div className="text-[9px] uppercase tracking-wide text-ink/40">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
