import { TradeQualityDashboard } from "@/components/trade-quality-dashboard";

export const metadata = {
  title: "Qualidade de Execução — Finacap",
  description: "Apuração de trades vs fechamento e tracking de pares vs IBOV",
};

export default function TradesPage() {
  return <TradeQualityDashboard />;
}
