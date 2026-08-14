import { GovernancaEmpresa } from "@/components/governanca-empresa";

export const metadata = {
  title: "Governança — Finacap",
  description: "Detalhes de governança da empresa",
};

export default function GovernancaTickerPage({
  params,
}: {
  params: { ticker: string };
}) {
  return <GovernancaEmpresa ticker={params.ticker.toUpperCase()} />;
}
