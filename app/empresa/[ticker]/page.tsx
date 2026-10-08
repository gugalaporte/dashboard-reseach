import { EmpresaPage } from "@/components/empresa-page";
import { displayTicker } from "@/lib/finacap-book";

export const metadata = {
  title: "Empresa — Finacap",
  description: "Página consolidada da empresa",
};

export default function EmpresaTickerPage({
  params,
  searchParams,
}: {
  params: { ticker: string };
  searchParams: { tab?: string };
}) {
  return (
    <EmpresaPage
      ticker={displayTicker(params.ticker)}
      initialTab={searchParams.tab}
    />
  );
}
