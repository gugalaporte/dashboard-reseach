import { redirect } from "next/navigation";
import { empresaHref } from "@/lib/empresa";

export const metadata = {
  title: "Empresa — Finacap",
  description: "Página consolidada da empresa",
};

export default function GovernancaTickerPage({
  params,
}: {
  params: { ticker: string };
}) {
  redirect(`${empresaHref(params.ticker)}?tab=governanca`);
}
