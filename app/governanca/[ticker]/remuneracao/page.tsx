import { GovernancaRemuneracao } from "@/components/governanca-remuneracao";

export const metadata = {
  title: "Remuneração dos Executivos — Finacap",
  description: "Remuneração da diretoria estatutária (CVM)",
};

export default function GovernancaRemuneracaoPage({
  params,
}: {
  params: { ticker: string };
}) {
  return <GovernancaRemuneracao ticker={params.ticker.toUpperCase()} />;
}
