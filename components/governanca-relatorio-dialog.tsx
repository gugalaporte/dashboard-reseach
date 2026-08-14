"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ReportMarkdown } from "@/components/report-markdown";
import { parseSynthesis, type CeoAnalise } from "@/lib/ceo-analise";

function shortCeoName(data: CeoAnalise): string {
  const raw = (data.ceoName || data.synthesisCeo || "").trim();
  if (!raw) return data.ticker;
  return raw.split(/[;(]/)[0].trim() || raw;
}

function ReportColumn({
  title,
  source,
}: {
  title: string;
  source: string | null;
}) {
  return (
    <section className="min-w-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
        {title}
      </h3>
      <div className="mt-3">
        {source?.trim() ? (
          <ReportMarkdown source={source} />
        ) : (
          <p className="text-sm text-ink/45">Sem relatório.</p>
        )}
      </div>
    </section>
  );
}

/** Modal do dossiê completo: síntese + track record + alinhamento. */
export function GovernancaRelatorioDialog({
  data,
  open,
  onClose,
}: {
  data: CeoAnalise;
  open: boolean;
  onClose: () => void;
}) {
  const parsed = parseSynthesis(data.synthesisText);
  const name = shortCeoName(data);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[min(96vw,80rem)] max-h-[90vh]">
        <div className="px-5 sm:px-6 pt-5 pr-12 border-b border-line shrink-0 pb-4">
          <DialogTitle className="font-display text-xl text-ink">
            Relatório completo — {name}
          </DialogTitle>
          <p className="text-sm text-ink/50 mt-1">
            {data.ticker}
            {data.companyName ? ` · ${data.companyName}` : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5 space-y-6">
          <div className="border border-line border-l-2 border-l-brand bg-white">
            {data.synthesisVeredito && (
              <div className="bg-brand/10 text-brand text-[12px] font-medium px-4 py-2">
                {data.synthesisVeredito}
              </div>
            )}
            <div className="px-4 py-4">
              {parsed.summary && (
                <p className="text-[13px] text-ink/70 leading-relaxed">
                  {parsed.summary}
                </p>
              )}
              {parsed.strengths.length > 0 && (
                <BulletBlock title="Pontos fortes" items={parsed.strengths} />
              )}
              {parsed.risks.length > 0 && (
                <BulletBlock title="Riscos" items={parsed.risks} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <ReportColumn title="Track record" source={data.trackRecordReport} />
            <ReportColumn title="Alinhamento" source={data.alignmentReport} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulletBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <h4 className="text-[10px] uppercase tracking-[0.16em] text-ink/45 font-medium mb-2">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.slice(0, 48)}
            className="text-[13px] text-ink/70 leading-relaxed pl-3.5 relative before:content-['•'] before:absolute before:left-0 before:text-ink/40"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
