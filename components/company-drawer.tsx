"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getHistoricoEmpresa, getPdfsEmpresa } from "@/lib/queries";
import type { ResearchRow } from "@/lib/queries";
import type { MetricaRow, PdfDoc } from "@/types/research";
import { formatDateLong, formatDateShort, formatNumber, formatValue } from "@/lib/format";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  empresa: string | null;
  consenso: ResearchRow[];
  onClose: () => void;
}

export function CompanyDrawer({ empresa, consenso, onClose }: Props) {
  const [hist, setHist] = React.useState<MetricaRow[]>([]);
  const [pdfs, setPdfs] = React.useState<PdfDoc[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!empresa) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getHistoricoEmpresa(empresa), getPdfsEmpresa(empresa)])
      .then(([h, p]) => {
        if (cancelled) return;
        setHist(h);
        setPdfs(p);
      })
      .catch((e) => console.error("Drawer error:", e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [empresa]);

  // Matriz metrica x periodo (exclui Target Price que vira na aba Consenso).
  const { periodos, byMetrica } = React.useMemo(() => {
    const pSet = new Set<string>();
    const map = new Map<string, Map<string, MetricaRow>>();
    for (const r of hist) {
      if (r.metrica === "Target Price") continue;
      pSet.add(r.periodo);
      if (!map.has(r.metrica)) map.set(r.metrica, new Map());
      const per = map.get(r.metrica)!;
      const cur = per.get(r.periodo);
      if (!cur || (cur.data_relatorio ?? "") < (r.data_relatorio ?? "")) {
        per.set(r.periodo, r);
      }
    }
    // Ordena periodos: anos numericos ascendente, depois outros.
    const periodos = Array.from(pSet).sort((a, b) => {
      const yA = parseInt(a, 10);
      const yB = parseInt(b, 10);
      if (!Number.isNaN(yA) && !Number.isNaN(yB) && yA !== yB) return yA - yB;
      return a.localeCompare(b);
    });
    return { periodos, byMetrica: map };
  }, [hist]);

  const metricas = React.useMemo(
    () => Array.from(byMetrica.keys()).sort(),
    [byMetrica]
  );

  return (
    <Sheet open={!!empresa} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] max-w-none bg-surface-soft border-l border-line p-0">
        {/* Header editorial */}
        <SheetHeader className="px-8 py-6 border-b border-line bg-surface-soft">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-medium">
            Empresa
          </div>
          <SheetTitle className="font-display text-3xl text-ink leading-tight mt-1">
            {empresa}
          </SheetTitle>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center h-6 px-2 rounded-sm bg-navy/5 border border-navy/10 font-mono text-[11px] tracking-wide text-navy">
              {empresa}
            </span>
            <span className="text-xs text-ink/40">•</span>
            <span className="text-xs text-ink/60">
              {consenso.length} casa{consenso.length === 1 ? "" : "s"} cobrem
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <Tabs defaultValue="metricas" className="flex flex-col">
            <TabsList className="mx-8 mt-6">
              <TabsTrigger value="metricas">Métricas</TabsTrigger>
              <TabsTrigger value="consenso">Consenso</TabsTrigger>
              <TabsTrigger value="pdfs">Relatórios</TabsTrigger>
            </TabsList>

            <TabsContent value="metricas" className="px-8 pb-8">
              {loading ? (
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : metricas.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink/50">
                  Sem histórico estruturado.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-line scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead className="bg-navy text-surface-soft/80 text-[10px] uppercase tracking-[0.14em]">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">
                          Métrica
                        </th>
                        {periodos.map((p) => (
                          <th
                            key={p}
                            className="text-right px-3 py-2 font-medium tabular"
                          >
                            {p}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metricas.map((m, idx) => (
                        <tr
                          key={m}
                          className={cn(
                            "border-t border-line/60",
                            idx % 2 === 1 && "bg-surface/40"
                          )}
                        >
                          <td className="px-3 py-2 font-medium text-ink">
                            {m}
                          </td>
                          {periodos.map((p) => {
                            const r = byMetrica.get(m)?.get(p);
                            return (
                              <td
                                key={p}
                                className="px-3 py-2 text-right font-mono tabular text-ink"
                              >
                                {r && r.valor != null ? (
                                  formatNumber(
                                    r.valor,
                                    r.unidade === "%" || r.unidade === "x" ? 1 : 0
                                  )
                                ) : (
                                  <span className="text-line/60">–</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="consenso" className="px-8 pb-8">
              {consenso.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink/50">
                  Sem cobertura de consenso disponível.
                </div>
              ) : (
                <div className="rounded-md border border-line overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-navy text-surface-soft/80 text-[10px] uppercase tracking-[0.14em]">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Casa</th>
                        <th className="text-left px-3 py-2 font-medium">
                          Rating
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Preço
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Target
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Upside
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {consenso.map((c, idx) => {
                        const price = c.price?.value ?? null;
                        const target = c.target;
                        const upside =
                          price != null && target && target.ccy === "R$"
                            ? ((target.value - price) / price) * 100
                            : null;
                        return (
                          <tr
                            key={c.fonte}
                            className={cn(
                              "border-t border-line/60",
                              idx % 2 === 1 && "bg-surface/40"
                            )}
                          >
                            <td className="px-3 py-2 font-medium text-ink">
                              {c.fonte}
                            </td>
                            <td className="px-3 py-2 text-ink/80">
                              {c.rating?.value ?? (
                                <span className="text-line/60 font-mono">–</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular">
                              {price != null ? (
                                formatValue(price, "money", "R$")
                              ) : (
                                <span className="text-line/60">–</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular">
                              {target ? (
                                formatValue(target.value, "money", target.ccy)
                              ) : (
                                <span className="text-line/60">–</span>
                              )}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right font-mono tabular",
                                upside == null
                                  ? "text-line/60"
                                  : upside >= 0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                              )}
                            >
                              {upside != null
                                ? `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`
                                : "–"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdfs" className="px-8 pb-8">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : pdfs.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink/50">
                  Sem PDFs vinculados.
                </div>
              ) : (
                <ul className="space-y-2">
                  {pdfs.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 rounded-md border border-line bg-surface-soft p-3"
                    >
                      <FileText className="h-4 w-4 mt-0.5 text-brand flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs text-ink truncate"
                          title={p.file_name}
                        >
                          {p.file_name}
                        </div>
                        <div className="text-[10px] text-ink/50 mt-1 font-mono tabular">
                          {formatDateLong(p.pdf_date)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Guarda referencia unica para formatDateShort (evita warning de import nao-usado
// caso a aba de metricas mude no futuro).
export { formatDateShort };
