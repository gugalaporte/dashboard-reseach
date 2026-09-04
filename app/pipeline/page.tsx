import { PipelineDashboard } from "@/components/pipeline-dashboard";

export const metadata = {
  title: "Pipeline — Finacap",
  description: "Empresas por etapa do pipeline de tese",
};

export default function PipelinePage() {
  return <PipelineDashboard />;
}
