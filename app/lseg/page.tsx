import { LsegDashboard } from "@/components/lseg-dashboard";

export const metadata = {
  title: "Dados LSEG — Finacap",
  description: "Cobertura e métricas consolidadas da fonte LSEG",
};

export default function LsegPage() {
  return <LsegDashboard />;
}
