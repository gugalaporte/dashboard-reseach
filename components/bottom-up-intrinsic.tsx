"use client";

import type { IntrinsicEstimate } from "@/lib/bottom-up-types";
import { evFairSteps } from "@/lib/fair-price-steps";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { estimate: IntrinsicEstimate };

/** Preço justo vs mercado (múltiplo-alvo simples). */
export function BottomUpIntrinsic({ estimate }: Props) {
  const {
    method,
    marketPrice,
    fairPrice,
    upsidePct,
    targetMultiple,
    currentMultiple,
    notes,
  } = estimate;
  const steps = evFairSteps(estimate);
  const alvoSetor = notes.includes("mediana do EV/EBITDA do setor");
  const dividaLiquida = notes.includes("dívida líquida");
  const ccy = estimate.marketCapCurrency?.trim();
  const mesmaLinha = ccy
    ? `Enterprise value, market cap, preço e o múltiplo atual vêm da mesma linha do último daily_snapshot (LSEG), em ${ccy}.`
    : "Enterprise value, market cap, preço e o múltiplo atual vêm da mesma linha do último daily_snapshot (LSEG).";

  const cheap =
    upsidePct != null ? upsidePct > 10 : null;
  const expensive =
    upsidePct != null ? upsidePct < -10 : null;

  return (
    <div className="space-y-4">
      {steps ? (
        <div className="space-y-2">
          <div className="space-y-1 text-xs text-ink/45 leading-relaxed">
            <p>
              {alvoSetor
                ? "O múltiplo-alvo é a mediana do EV/EBITDA atual dos pares do mesmo setor LSEG."
                : "O múltiplo-alvo é a média histórica do EV/EBITDA: um ponto por mês, o último snapshot de cada mês."}
            </p>
            <p>{mesmaLinha}</p>
            <p>
              {dividaLiquida
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
                <dd className="text-xs tabular text-ink sm:text-right">
                  {step.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-xs text-ink/45 leading-relaxed">{notes}</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PriceCard label="Preço mercado" value={marketPrice} />
        <PriceCard
          label="Preço justo"
          value={fairPrice}
          accent
        />
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
          {upsidePct == null
            ? "–"
            : `${upsidePct > 0 ? "+" : ""}${formatNumber(upsidePct, 1)}%`}
        </div>
        <div className="text-[11px] text-ink/40 mt-1">{method}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Meta
          label="Múltiplo atual"
          value={
            currentMultiple == null ? "–" : formatNumber(currentMultiple, 2)
          }
        />
        <Meta
          label="Múltiplo-alvo"
          value={
            targetMultiple == null ? "–" : formatNumber(targetMultiple, 2)
          }
        />
      </div>
    </div>
  );
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
      <div className="text-[9px] uppercase tracking-wide text-ink/40">
        {label}
      </div>
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
      <div className="text-[9px] uppercase tracking-wide text-ink/40">
        {label}
      </div>
      <div className="tabular text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
