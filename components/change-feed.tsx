"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateLong, formatDateShort, formatNumber, formatValue, parseDisplayDate } from "@/lib/format";
import { FONTES, FONTE_SHORT_LABEL } from "@/lib/queries";
import { sectorPt } from "@/lib/sector-labels";
import type { RevisionEvent, RevisionKindFilter, RevisionPeriodFilter } from "@/types/revisions";

const PERIODS: RevisionPeriodFilter[] = ["24h", "7d", "30d", "90d"];
const KIND_OPTIONS: Array<{ id: RevisionKindFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "tp_raise", label: "Apenas elevações de Target" },
  { id: "tp_cut", label: "Apenas cortes de Target" },
  { id: "rating", label: "Apenas mudanças de rating" },
];

function relativeDateLabel(d: string): string {
  const now = new Date();
  const dt = parseDisplayDate(d);
  const dayMs = 86400000;
  const diff = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()) /
      dayMs
  );
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  return `há ${diff} dias`;
}

function groupDateLabel(d: string): string {
  const rel = relativeDateLabel(d);
  const abs = formatDateLong(d);
  if (rel === "hoje") return `Hoje · ${abs}`;
  if (rel === "ontem") return `Ontem · ${abs}`;
  return abs;
}

function sourceChipClass(fonte: string): string {
  if (fonte === "BTG Pactual") return "border-[#1B61B6] text-[#1B61B6]";
  if (fonte === "Bradesco BBI") return "border-[#C0392B] text-[#C0392B]";
  if (fonte === "Safra") return "border-[#B8860B] text-[#B8860B]";
  if (fonte === "Itaú BBA") return "border-[#EC7000] text-[#EC7000]";
  return "border-line text-ink/70";
}

function eventTone(e: RevisionEvent): string {
  if (e.event_type === "new_coverage") return "border-l-sky-500";
  if (e.tp_direction === "raise" || e.rating_direction === "upgrade") return "border-l-emerald-600";
  if (e.tp_direction === "cut" || e.rating_direction === "downgrade") return "border-l-red-600";
  return "border-l-slate-400";
}

function pctTone(e: RevisionEvent): string {
  if ((e.tp_change_pct ?? 0) > 0) return "text-emerald-700";
  if ((e.tp_change_pct ?? 0) < 0) return "text-red-700";
  return "text-ink/50";
}

function eventSummary(e: RevisionEvent): string {
  const prevTp = e.prev_target_price != null ? formatValue(e.prev_target_price, "money", "R$") : "–";
  const currTp = e.target_price != null ? formatValue(e.target_price, "money", "R$") : "–";
  const pct = e.tp_change_pct != null ? `${e.tp_change_pct > 0 ? "+" : ""}${e.tp_change_pct.toFixed(1)}%` : "";
  if (e.event_type === "new_coverage") {
    return `Iniciou cobertura com ${e.rating ?? "sem rating"}, Target ${currTp}`;
  }
  if (e.event_type === "rating_change") {
    const dir = e.rating_direction === "upgrade" ? "Upgrade" : e.rating_direction === "downgrade" ? "Downgrade" : "Mudança";
    return `${dir} de ${e.prev_rating ?? "–"} → ${e.rating ?? "–"}`;
  }
  if (e.event_type === "rating_and_tp_change") {
    const dir = e.rating_direction === "upgrade" ? "Upgrade" : e.rating_direction === "downgrade" ? "Downgrade" : "Mudança";
    const tpVerb = (e.tp_change_pct ?? 0) >= 0 ? "e elevou Target" : "e cortou Target";
    return `${dir} de ${e.prev_rating ?? "–"} → ${e.rating ?? "–"} ${tpVerb} ${prevTp} → ${currTp} (${pct})`;
  }
  const tpVerb = (e.tp_change_pct ?? 0) >= 0 ? "Elevou Target" : "Cortou Target";
  return `${tpVerb} de ${prevTp} → ${currTp} (${pct})`;
}

function fileUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${filePath.replace(/^\/+/, "")}`;
}

interface ChangeFeedProps {
  sectionId?: string;
}

export function ChangeFeed({ sectionId }: ChangeFeedProps) {
  const [period, setPeriod] = React.useState<RevisionPeriodFilter>("30d");
  const [kind, setKind] = React.useState<RevisionKindFilter>("all");
  const [fontes, setFontes] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<RevisionEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCount, setShowCount] = React.useState(20);
  const [selected, setSelected] = React.useState<RevisionEvent | null>(null);
  const [timeline, setTimeline] = React.useState<RevisionEvent[]>([]);

  React.useEffect(() => {
    const qs = new URLSearchParams({
      period,
      kind,
      limit: "100",
    });
    if (fontes.length > 0) qs.set("fontes", fontes.join(","));
    setLoading(true);
    fetch(`/api/revisions?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? (data as RevisionEvent[]) : []))
      .catch((e) => {
        console.error("change-feed:", e);
        setRows([]);
      })
      .finally(() => {
        setShowCount(20);
        setLoading(false);
      });
  }, [period, kind, fontes]);

  React.useEffect(() => {
    if (!selected) return;
    const qs = new URLSearchParams({
      period: "365d",
      ticker: selected.ticker,
      fonte: selected.fonte,
      limit: "200",
    });
    fetch(`/api/revisions?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setTimeline(Array.isArray(data) ? (data as RevisionEvent[]) : []))
      .catch((e) => {
        console.error("change-feed-timeline:", e);
        setTimeline([]);
      });
  }, [selected]);

  const visible = rows.slice(0, showCount);
  const maxAbsPct = React.useMemo(
    () =>
      Math.max(
        1,
        ...visible.map((r) => Math.abs(r.tp_change_pct ?? 0)),
        ...rows.map((r) => Math.abs(r.tp_change_pct ?? 0))
      ),
    [visible, rows]
  );
  const highlights = React.useMemo(
    () =>
      [...rows]
        .filter((r) => r.tp_change_pct != null)
        .sort((a, b) => Math.abs(b.tp_change_pct ?? 0) - Math.abs(a.tp_change_pct ?? 0))
        .slice(0, 3),
    [rows]
  );
  const grouped = React.useMemo(() => {
    const map = new Map<string, RevisionEvent[]>();
    for (const row of visible) {
      const key = row.event_date.slice(0, 10);
      (map.get(key) ?? map.set(key, []).get(key)!).push(row);
    }
    return Array.from(map.entries()).map(([date, events]) => ({ date, events }));
  }, [visible]);

  function toggleFonte(fonte: string) {
    setFontes((prev) => (prev.includes(fonte) ? prev.filter((x) => x !== fonte) : [...prev, fonte]));
  }

  return (
    <>
      <section id={sectionId} className="rounded-lg border border-line bg-surface-soft p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl text-ink mr-2">Mudanças Recentes</h3>
          <div className="flex items-center gap-1 rounded-md bg-surface p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition",
                  period === p ? "bg-navy text-surface-soft" : "text-ink/60 hover:text-ink"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md bg-surface p-1">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={cn(
                  "px-3 h-8 rounded text-[11px] font-medium transition",
                  kind === k.id ? "bg-navy text-surface-soft" : "text-ink/60 hover:text-ink"
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFontes([])}
            className={cn(
              "h-7 px-2 rounded border text-[10px] uppercase tracking-[0.12em]",
              fontes.length === 0 ? "bg-navy text-surface-soft border-navy" : "border-line text-ink/70"
            )}
          >
            Todas
          </button>
          {FONTES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFonte(f)}
              className={cn(
                "h-7 px-2 rounded border text-[10px] uppercase tracking-[0.12em]",
                fontes.includes(f) ? "bg-navy text-surface-soft border-navy" : "border-line text-ink/70"
              )}
            >
              {FONTE_SHORT_LABEL[f]}
            </button>
          ))}
        </div>

        {!loading && highlights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {highlights.map((h) => (
              <button
                key={`highlight_${h.ticker}_${h.event_date}_${h.fonte}`}
                type="button"
                onClick={() => setSelected(h)}
                className={cn(
                  "rounded-md border border-line p-3 text-left border-l-[3px] hover:bg-[#eef4ff] transition",
                  eventTone(h)
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm text-ink">{h.ticker}</div>
                  <div className={cn("font-mono tabular text-base", pctTone(h))}>
                    {h.tp_change_pct != null
                      ? `${h.tp_change_pct > 0 ? "+" : ""}${formatNumber(h.tp_change_pct, 1)}%`
                      : "–"}
                  </div>
                </div>
                <div className="mt-1 text-xs text-ink/70 line-clamp-1">{eventSummary(h)}</div>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)
          ) : visible.length === 0 ? (
            <div className="py-8 text-sm text-ink/50 text-center">Sem mudanças para os filtros selecionados.</div>
          ) : (
            grouped.map((g) => (
              <div key={g.date} className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-ink/50 font-medium pt-1 border-t border-line/70">
                  {groupDateLabel(g.date)}
                </div>
                <div className="space-y-1">
                  {g.events.map((e) => {
                    const abs = Math.abs(e.tp_change_pct ?? 0);
                    const widthPct = Math.max(0, Math.min(100, (abs / maxAbsPct) * 100));
                    return (
                      <button
                        key={`${e.ticker}|${e.fonte}|${e.event_date}|${e.pdf_id ?? 0}`}
                        type="button"
                        onClick={() => setSelected(e)}
                        title={`Anterior: ${formatDateLong(e.prev_report_date)}${e.prev_pdf_id ? ` · PDF #${e.prev_pdf_id}` : ""}`}
                        className={cn(
                          "group w-full text-left rounded-md border border-line bg-surface-soft px-2.5 py-1.5 border-l-[3px] transition",
                          eventTone(e),
                          "hover:bg-[#eef4ff]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center h-5 px-1.5 rounded-sm bg-navy/5 border border-navy/10 font-mono text-[10px] tracking-wide text-navy">
                            {e.ticker}
                          </div>
                          <div className="inline-flex items-center h-5 px-1.5 rounded-sm bg-surface border border-line text-[9px] uppercase tracking-[0.12em] text-ink/60">
                            {sectorPt(e.sector)}
                          </div>
                          <div
                            className={cn(
                              "inline-flex items-center h-5 px-1.5 rounded-sm border text-[9px] uppercase tracking-[0.1em] font-medium",
                              sourceChipClass(e.fonte)
                            )}
                          >
                            {FONTE_SHORT_LABEL[e.fonte as keyof typeof FONTE_SHORT_LABEL] ?? e.fonte}
                          </div>
                          <div className="min-w-0 flex-1 text-xs text-ink truncate">{eventSummary(e)}</div>
                          {fileUrl(e.previous_file_path) && (
                            <a
                              href={fileUrl(e.previous_file_path)!}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(ev) => ev.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-ink/50 hover:text-ink"
                              title={`Abrir PDF anterior (${formatDateLong(e.prev_report_date)})`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <div className="w-28 shrink-0 flex items-center gap-2">
                            <div className={cn("font-mono tabular text-xs w-14 text-right", pctTone(e))}>
                              {e.tp_change_pct != null
                                ? `${e.tp_change_pct > 0 ? "+" : ""}${formatNumber(e.tp_change_pct, 1)}%`
                                : "–"}
                            </div>
                            <div className="h-1.5 flex-1 rounded bg-line/60 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded",
                                  (e.tp_change_pct ?? 0) >= 0 ? "bg-emerald-500" : "bg-red-500"
                                )}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && rows.length > showCount && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowCount((v) => Math.min(100, v + 20))}
              className="h-9 px-4 rounded-md border border-line text-sm text-ink/70 hover:text-ink"
            >
              Ver mais
            </button>
          </div>
        )}
      </section>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[760px] max-w-[92vw] bg-surface-soft border-l border-line p-0">
          <SheetHeader className="px-6 py-5 border-b border-line">
            <SheetTitle className="font-display text-2xl">
              {selected?.ticker} · {selected?.empresa ?? "Empresa"}
            </SheetTitle>
            <div className="text-xs text-ink/60 mt-1">{selected?.fonte}</div>
          </SheetHeader>
          <div className="p-6 overflow-y-auto space-y-5">
            {selected && (
              <>
                <div className="rounded-md border border-line p-4 bg-surface-soft space-y-1">
                  <div className="text-sm text-ink">{eventSummary(selected)}</div>
                  <div className="text-xs text-ink/60">
                    Evento: {formatDateLong(selected.event_date)} · Reporte anterior:{" "}
                    {formatDateLong(selected.prev_report_date)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fileUrl(selected.current_file_path) && (
                    <a
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-line text-sm hover:bg-surface"
                      href={fileUrl(selected.current_file_path)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF atual <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {fileUrl(selected.previous_file_path) && (
                    <a
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-line text-sm hover:bg-surface"
                      href={fileUrl(selected.previous_file_path)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF anterior <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <a
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-line text-sm hover:bg-surface"
                    href={fileUrl(selected.current_file_path) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver no Supabase <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink/50 mb-2">
                    Timeline (12 meses)
                  </div>
                  <div className="space-y-2">
                    {timeline.map((t) => (
                      <div
                        key={`${t.event_date}|${t.pdf_id ?? 0}`}
                        className={cn("rounded-md border border-line p-3 border-l-[3px]", eventTone(t))}
                      >
                        <div className="text-xs text-ink/50">{formatDateShort(t.event_date)}</div>
                        <div className="text-sm text-ink mt-1">{eventSummary(t)}</div>
                      </div>
                    ))}
                    {timeline.length === 0 && (
                      <div className="text-sm text-ink/50 py-3">Sem histórico no período.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

