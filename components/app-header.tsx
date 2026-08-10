"use client";

import * as React from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import {
  AppHeaderNav,
  AppHeaderMobileLinks,
  type Tab,
} from "@/components/app-header-nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateLong } from "@/lib/format";

type Props = {
  active: Tab;
  subtitle: string;
  /** ISO yyyy-mm-dd ou string exibível; omitir mostra "–". */
  lastUpdate?: string | null;
};

function formatLastUpdate(raw?: string | null): string {
  if (!raw) return "–";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return formatDateLong(raw.slice(0, 10));
  return raw;
}

/** Header compartilhado — desktop com nav central; mobile com menu Sheet. */
export function AppHeader({ active, subtitle, lastUpdate }: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-navy text-surface-soft border-b border-ink/30">
      <div className="mx-auto max-w-[1600px] h-14 md:h-16 px-4 sm:px-6 lg:px-8 flex md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1 md:flex-none">
          <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-sm bg-surface-soft grid place-items-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Finacap"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-display text-[15px] md:text-[17px] tracking-tight truncate">
              Finacap Research
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-surface-soft/60 mt-1 truncate">
              {subtitle}
            </span>
          </div>
        </div>

        <AppHeaderNav active={active} />

        {/* Desktop: data de atualização */}
        <div className="hidden md:flex flex-col items-end text-right leading-tight justify-self-end w-[180px] shrink-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-surface-soft/60">
            Última atualização
          </div>
          <div className="font-mono text-sm tabular mt-1">
            {formatLastUpdate(lastUpdate)}
          </div>
        </div>

        {/* Mobile: botão do menu */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="md:hidden shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md text-surface-soft/80 hover:bg-white/10 transition"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent className="w-[min(100vw,320px)] max-w-[100vw] p-0 bg-surface-soft">
          <SheetHeader className="px-4 py-5 border-b border-line text-left">
            <SheetTitle className="font-display text-lg text-ink">
              Navegação
            </SheetTitle>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink/50 mt-1">
              Última atualização · {formatLastUpdate(lastUpdate)}
            </p>
          </SheetHeader>
          <div className="px-3 py-2">
            <AppHeaderMobileLinks
              active={active}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
