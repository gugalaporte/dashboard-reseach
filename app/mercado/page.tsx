import { MercadoDashboard } from "@/components/mercado-dashboard";

export const metadata = {
  title: "Painel do Mercado — Finacap",
  description: "Retornos e evolução de índices, FX, commodities e curvas",
};

export default function MercadoPage() {
  return <MercadoDashboard />;
}
