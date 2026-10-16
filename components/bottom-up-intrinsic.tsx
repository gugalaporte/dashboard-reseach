"use client";

import type { IntrinsicEstimate } from "@/lib/bottom-up-types";
import { evFairSteps } from "@/lib/fair-price-steps";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { estimate: IntrinsicEstimate };

/** Preço justo (conta antiga) e, abaixo, preço alvo por múltiplo. */
export function BottomUpIntrinsic({ estimate }: Props) {
  return (
    <div className="space-y-8">
      <FairSection estimate={estimate} />
      <TargetSection estimate={estimate} />
    </div>
  );
}

function FairSection({ estimate }: Props) {
  const justo = estimate.justo;
  const steps = justo ? evFairSteps(justo) : null;
  const upside = justo?.upsidePct ?? null;
  const cheap = upside != null && upside > 10;
  const expensive = upside != null && upside < -10;
  const fromBalance = justo?.grossDebt != null && justo.cash != null;
  const sector = justo?.notes.includes("mediana do EV/EBITDA do setor") ?? false;
  const dividaLiquida = !fromBalance && (justo?.notes.includes("dívida líquida") ?? false);
  const ccy = justo?.marketCapCurrency?.trim();

  return (
    <section className="space-y-4">
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45">
        Preço justo
      </h3>
      {steps && justo ? (
        <div className="space-y-2">
          <div className="space-y-1 text-xs text-ink/45 leading-relaxed">
            <p>
              {sector
                ? "O múltiplo-alvo é a mediana do EV/EBITDA atual dos pares do mesmo setor LSEG."
                : "O múltiplo-alvo é a média histórica do EV/EBITDA: um ponto por mês, o último snapshot de cada mês."}
            </p>
            <p>
              {ccy
                ? `Enterprise value, market cap, preço e o múltiplo atual vêm da mesma linha do último daily_snapshot (LSEG), em ${ccy}.`
                : "Enterprise value, market cap, preço e o múltiplo atual vêm da mesma linha do último daily_snapshot (LSEG)."}
            </p>
            <p>
              {fromBalance
                ? "A dívida líquida é dívida − caixa no último daily_snapshot. O preço justo é preço × (EV justo − essa dívida) ÷ market cap."
                : dividaLiquida
                  ? "A dívida líquida é o campo net_debt. O enterprise value é market cap + essa dívida. O preço justo é preço × (EV justo − dívida líquida) ÷ market cap."
                  : "A dívida líquida implícita é enterprise value − market cap e inclui caixa, arrendamentos e minoritários. O preço justo é preço × (EV justo − essa dívida) ÷ market cap."}
            </p>
          </div>
          <dl className="border border-line bg-white divide-y divide-line">
            {steps.map((step) => (
              <div
                key={step.label}
                className="px-3 py-2 sm:flex sm:items-baseline sm:justify-between sm:gap-6"
              >
                <dt className="whitespace-nowrap text-[10px] uppercase tracking-wide text-ink/45">
                  {step.label}
                </dt>
                <dd className="text-xs tabular text-ink sm:text-right">{step.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-xs text-ink/45 leading-relaxed">
          Sem preço justo para este papel.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PriceCard label="Preço mercado" value={justo?.marketPrice ?? estimate.marketPrice} />
        <PriceCard label="Preço justo" value={justo?.fairPrice ?? null} accent />
      </div>

      <div
        className={cn(
          "border px-4 py-3 text-center",
          cheap && "border-emerald-600/30 bg-emerald-50/50",
          expensive && "border-rose-600/30 bg-rose-50/50",
          !cheap && !expensive && "border-line bg-white"
        )}
      >
        <div className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
          Upside / desconto
        </div>
        <div
          className={cn(
            "tabular text-2xl font-display mt-1",
            cheap && "text-emerald-700",
            expensive && "text-rose-700",
            !cheap && !expensive && "text-ink"
          )}
        >
          {upside == null ? "–" : `${upside > 0 ? "+" : ""}${formatNumber(upside, 1)}%`}
        </div>
        <div className="text-[11px] text-ink/40 mt-1">
          {justo?.method ?? "Indisponível"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Meta
          label="Múltiplo atual"
          value={justo?.currentMultiple == null ? "–" : formatNumber(justo.currentMultiple, 2)}
        />
        <Meta
          label="Múltiplo-alvo"
          value={justo?.targetMultiple == null ? "–" : formatNumber(justo.targetMultiple, 2)}
        />
      </div>
    </section>
  );
}

function TargetSection({ estimate }: Props) {
  const { notes, targets, grossDebt, cash, netDebt } = estimate;
  const ccy = estimate.marketCapCurrency?.trim();

  return (
    <section className="space-y-4">
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45">
        Preço alvo
      </h3>
      <div className="space-y-1 text-xs text-ink/45 leading-relaxed">
        <p>
          EV = equity + dívida − caixa. O preço da ação é o equity. O múltiplo
          histórico é a média do papel; o do setor é a mediana dos pares.
        </p>
        <p>
          EV/EBITDA: múltiplo × EBITDA = EV, e equity = EV − dívida líquida.
          P/L: lucro × P/L. P/BV: patrimônio × P/BV. Preço alvo = preço ×
          equity ÷ market cap.
          {ccy ? ` Valores em ${ccy}, do último daily_snapshot.` : ""}
        </p>
        {grossDebt != null && cash != null && netDebt != null && (
          <p>
            Dívida líquida = {formatBi(grossDebt)} − {formatBi(cash)} ={" "}
            {formatBi(netDebt)}.
          </p>
        )}
      </div>

      {targets.length === 0 ? (
        <p className="text-xs text-ink/45 leading-relaxed">{notes}</p>
      ) : (
        <div className="border border-line bg-white divide-y divide-line">
          {targets.map((t) => {
            const up = t.upsidePct;
            return (
              <div key={`${t.method}-${t.source}`} className="px-3 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-wide text-ink/45 whitespace-nowrap">
                    {t.method} · {t.source}
                  </div>
                  <div className="text-right">
                    <div className="tabular text-sm font-semibold text-ink">
                      R$ {formatNumber(t.price, 2)}
                    </div>
                    <div
                      className={cn(
                        "tabular text-[11px]",
                        up > 10 && "text-emerald-700",
                        up < -10 && "text-rose-700",
                        up <= 10 && up >= -10 && "text-ink/50"
                      )}
                    >
                      {up > 0 ? "+" : ""}
                      {formatNumber(up, 1)}%
                    </div>
                  </div>
                </div>
                <div className="mt-1 space-y-0.5">
                  {t.lines.map((line) => (
                    <p key={line} className="text-xs tabular text-ink/70">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatBi(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${formatNumber(v / 1e9, 3)} bi`;
  if (abs >= 1e6) return `${formatNumber(v / 1e6, 1)} mi`;
  return formatNumber(v, 2);
}

function PriceCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "border px-3 py-3",
        accent ? "border-brand/30 bg-brand/5" : "border-line bg-white"
      )}
    >
      <div className="text-[9px] uppercase tracking-wide text-ink/40">{label}</div>
      <div
        className={cn(
          "tabular text-lg font-semibold mt-1",
          accent ? "text-brand" : "text-ink"
        )}
      >
        {value == null ? "–" : `R$ ${formatNumber(value, 2)}`}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-white px-3 py-2">
      <div className="text-[9px] uppercase tracking-wide text-ink/40">{label}</div>
      <div className="tabular text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
