"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type Tab = "research" | "lseg" | "factors" | "governanca" | "trades";

export const NAV_ITEMS: { id: Tab; href: string; label: string }[] = [
  { id: "research", href: "/", label: "Research" },
  { id: "lseg", href: "/lseg", label: "Dados Lseg" },
  { id: "factors", href: "/factors", label: "Screening" },
  { id: "governanca", href: "/governanca", label: "Governança" },
  { id: "trades", href: "/trades", label: "Execução" },
];

function tabClass(active: boolean) {
  return cn(
    "px-3 h-8 inline-flex items-center text-[11px] font-medium uppercase tracking-[0.12em] transition border-b-2",
    active
      ? "text-surface-soft border-surface-soft"
      : "text-surface-soft/45 border-transparent hover:text-surface-soft/80"
  );
}

/** Nav desktop (tabs centrais no header). */
export function AppHeaderNav({ active }: { active: Tab }) {
  return (
    <nav
      className="hidden md:flex items-center gap-1"
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map((item) =>
        active === item.id ? (
          <span key={item.id} className={tabClass(true)}>
            {item.label}
          </span>
        ) : (
          <Link key={item.id} href={item.href} className={tabClass(false)}>
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}

/** Links empilhados para o menu mobile (Sheet). */
export function AppHeaderMobileLinks({
  active,
  onNavigate,
}: {
  active: Tab;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 py-2" aria-label="Navegação principal">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "px-3 py-3 rounded-md text-[13px] font-medium uppercase tracking-[0.12em] transition",
              isActive
                ? "bg-navy text-surface-soft"
                : "text-ink/70 hover:bg-surface hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
