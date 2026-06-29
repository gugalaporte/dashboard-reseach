import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab = "research" | "trades";

function tabClass(active: boolean) {
  return cn(
    "px-3 h-8 inline-flex items-center text-[11px] font-medium uppercase tracking-[0.12em] transition border-b-2",
    active
      ? "text-surface-soft border-surface-soft"
      : "text-surface-soft/45 border-transparent hover:text-surface-soft/80"
  );
}

export function AppHeaderNav({ active }: { active: Tab }) {
  return (
    <nav className="flex items-center gap-1" aria-label="Navegação principal">
      {active === "research" ? (
        <span className={tabClass(true)}>Research</span>
      ) : (
        <Link href="/" className={tabClass(false)}>
          Research
        </Link>
      )}
      {active === "trades" ? (
        <span className={tabClass(true)}>Execução</span>
      ) : (
        <Link href="/trades" className={tabClass(false)}>
          Execução
        </Link>
      )}
    </nav>
  );
}
