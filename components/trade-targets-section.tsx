"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TickerSearch } from "@/components/ticker-search";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatValue } from "@/lib/format";
import { parseAmount, type TradeAmountType, type TradeSide, type TradeTarget } from "@/lib/trade-targets";
import { cn } from "@/lib/utils";

type Props = { extraTickers?: string[] };

const EMPTY = { ticker: "", side: "" as "" | TradeSide, amountType: "qty" as TradeAmountType, amount: "" };

export function TradeTargetsSection({ extraTickers = [] }: Props) {
  const [targets, setTargets] = React.useState<TradeTarget[]>([]);
  const [tickers, setTickers] = React.useState<string[]>([]);
  const [draft, setDraft] = React.useState(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const options = React.useMemo(() => {
    const set = new Set(tickers);
    for (const t of extraTickers) if (t) set.add(t);
    return Array.from(set).sort();
  }, [tickers, extraTickers]);

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/trades/targets", { cache: "no-store" });
    const json = (await res.json()) as {
      targets?: TradeTarget[];
      tickers?: string[];
      error?: string;
    };
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    setTargets(json.targets ?? []);
    setTickers(json.tickers ?? []);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const canSave = Boolean(draft.ticker && draft.side && parseAmount(draft.amount));

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trades/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: draft.ticker,
          side: draft.side,
          amountType: draft.amountType,
          amount: draft.amount,
        }),
      });
      const json = (await res.json()) as TradeTarget & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDraft(EMPTY);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/trades/targets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return (
    <section className="rounded-md border border-line bg-surface-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-surface">
        <h2 className="font-display text-[15px] text-ink">Metas de Compra/Venda</h2>
        <p className="text-[11px] text-ink/50 mt-0.5">
          Uma meta por papel e lado · salvar de novo atualiza o valor
        </p>
      </div>

      <div className="px-4 py-3 border-b border-line bg-surface-soft/80 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-ink/50">Empresa</label>
          <TickerSearch
            compact
            options={options}
            value={draft.ticker}
            onChange={(ticker) => setDraft((p) => ({ ...p, ticker }))}
            placeholder="Selecionar"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-ink/50">Lado</label>
          <Select
            value={draft.side || undefined}
            onValueChange={(v) => setDraft((p) => ({ ...p, side: v as TradeSide }))}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs bg-surface border-line">
              <SelectValue placeholder="Compra/venda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy" className="text-xs">Compra</SelectItem>
              <SelectItem value="sell" className="text-xs">Venda</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-ink/50">Tipo</label>
          <Select
            value={draft.amountType}
            onValueChange={(v) => setDraft((p) => ({ ...p, amountType: v as TradeAmountType }))}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs bg-surface border-line">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qty" className="text-xs">Quantidade</SelectItem>
              <SelectItem value="value" className="text-xs">Valor (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-ink/50">
            {draft.amountType === "value" ? "Valor" : "Quantidade"}
          </label>
          <Input
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
            placeholder={draft.amountType === "value" ? "1.500.000" : "10.000"}
            className="w-[140px] h-8 text-xs bg-surface border-line tabular"
          />
        </div>
        <Button type="button" size="sm" className="h-8 text-xs gap-1.5" disabled={!canSave || saving} onClick={save}>
          <Plus className="w-3.5 h-3.5" />
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-destructive border-b border-line bg-destructive/5">{error}</div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="bg-navy hover:bg-navy border-none">
              {["Papel", "Lado", "Tipo", "Meta", ""].map((h) => (
                <TableHead
                  key={h || "actions"}
                  className="text-[9px] uppercase tracking-[0.14em] text-surface-soft/80 font-medium h-9 text-center"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : targets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-ink/50 py-8 text-sm">
                  Nenhuma meta cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              targets.map((t, i) => (
                <TableRow key={t.id} className={cn("border-line", i % 2 === 0 ? "bg-surface-soft" : "bg-white")}>
                  <TableCell className="text-center font-medium text-ink tabular">{t.ticker}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase tracking-wide font-medium",
                        t.side === "buy"
                          ? "border-brand/40 text-brand bg-brand/5"
                          : "border-ink/20 text-ink/70 bg-surface"
                      )}
                    >
                      {t.side === "buy" ? "Compra" : "Venda"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs text-ink/60">
                    {t.amountType === "qty" ? "Quantidade" : "Valor"}
                  </TableCell>
                  <TableCell className="text-center tabular text-sm font-medium text-ink">
                    {t.amountType === "value"
                      ? formatValue(t.amount, "money", "R$")
                      : formatNumber(t.amount, t.amount % 1 === 0 ? 0 : 2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      className="p-1 rounded text-ink/40 hover:text-destructive transition"
                      aria-label={`Remover meta ${t.ticker}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
