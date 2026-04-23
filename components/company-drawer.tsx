"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getHistoricoEmpresa, getPdfsEmpresa } from "@/lib/queries";
import type { MetricaRow, PdfDoc } from "@/types/research";
import { formatDate, formatNumber } from "@/lib/format";
import { FileText } from "lucide-react";

interface Props {
  empresa: string | null;
  onClose: () => void;
}

export function CompanyDrawer({ empresa, onClose }: Props) {
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

  // Monta matriz metrica x periodo agregando ultimo valor disponivel por (metrica, periodo, fonte).
  const { periodos, byMetrica, targetsByFonte } = React.useMemo(() => {
    const pSet = new Set<string>();
    const map = new Map<string, Map<string, MetricaRow>>();
    const targets: Record<string, MetricaRow> = {};

    for (const r of hist) {
      if (r.metrica === "Target Price") {
        // Guarda target por fonte (mais recente primeiro porque a lista nao esta ordenada).
        const cur = targets[r.fonte];
        if (!cur || (cur.data_relatorio ?? "") < (r.data_relatorio ?? "")) {
          targets[r.fonte] = r;
        }
        continue;
      }
      pSet.add(r.periodo);
      if (!map.has(r.metrica)) map.set(r.metrica, new Map());
      const per = map.get(r.metrica)!;
      const cur = per.get(r.periodo);
      if (!cur || (cur.data_relatorio ?? "") < (r.data_relatorio ?? "")) {
        per.set(r.periodo, r);
      }
    }

    // Ordena periodos de forma humana (numerico primeiro, E no fim).
    const periodos = Array.from(pSet).sort((a, b) => {
      const yA = parseInt(a, 10);
      const yB = parseInt(b, 10);
      if (!Number.isNaN(yA) && !Number.isNaN(yB) && yA !== yB) return yA - yB;
      return a.localeCompare(b);
    });

    return { periodos, byMetrica: map, targetsByFonte: targets };
  }, [hist]);

  const metricas = React.useMemo(
    () => Array.from(byMetrica.keys()).sort(),
    [byMetrica]
  );

  return (
    <Sheet open={!!empresa} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            <span className="font-mono">{empresa}</span> — histórico
          </SheetTitle>
          <SheetDescription>
            Todas as métricas armazenadas em <code>dados_estruturados</code>.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              {/* Targets por casa */}
              <section>
                <h4 className="text-sm font-semibold text-ink/70 mb-2">
                  Target Prices por corretora
                </h4>
                {Object.keys(targetsByFonte).length === 0 ? (
                  <div className="text-sm text-ink/50">Sem target disponível.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(targetsByFonte).map(([fonte, r]) => (
                      <div
                        key={fonte}
                        className="rounded-md border border-line bg-surface-soft px-3 py-2"
                      >
                        <div className="text-xs text-ink/60">{fonte}</div>
                        <div className="font-semibold tabular-nums">
                          {r.unidade === "US$" ? "US$" : "R$"}{" "}
                          {formatNumber(r.valor, 2)}
                        </div>
                        <div className="text-[10px] text-ink/40">
                          {formatDate(r.data_relatorio)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Matriz metrica x periodo */}
              <section>
                <h4 className="text-sm font-semibold text-ink/70 mb-2">
                  Métricas por período
                </h4>
                {metricas.length === 0 ? (
                  <div className="text-sm text-ink/50">Sem histórico.</div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-line">
                    <table className="w-full text-xs">
                      <thead className="bg-navy text-surface-soft">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-medium">Métrica</th>
                          {periodos.map((p) => (
                            <th
                              key={p}
                              className="text-right px-2 py-1.5 font-medium tabular-nums"
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
                            className={idx % 2 === 0 ? "bg-surface-soft" : "bg-surface"}
                          >
                            <td className="px-2 py-1.5 font-medium">{m}</td>
                            {periodos.map((p) => {
                              const r = byMetrica.get(m)?.get(p);
                              return (
                                <td
                                  key={p}
                                  className="px-2 py-1.5 text-right tabular-nums"
                                >
                                  {r ? (
                                    formatNumber(
                                      r.valor,
                                      r.unidade === "%" ||
                                        r.unidade === "x"
                                        ? 1
                                        : 0
                                    )
                                  ) : (
                                    <span className="text-line">—</span>
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
              </section>

              {/* PDFs-origem */}
              <section>
                <h4 className="text-sm font-semibold text-ink/70 mb-2">
                  PDFs de origem ({pdfs.length})
                </h4>
                {pdfs.length === 0 ? (
                  <div className="text-sm text-ink/50">Sem PDFs vinculados.</div>
                ) : (
                  <ul className="space-y-2">
                    {pdfs.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-start gap-2 rounded-md border border-line bg-surface-soft p-2 text-xs"
                      >
                        <FileText className="h-4 w-4 mt-0.5 text-brand flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium" title={p.file_name}>
                            {p.file_name}
                          </div>
                          <Badge variant="muted" className="mt-1">
                            {formatDate(p.pdf_date)}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
