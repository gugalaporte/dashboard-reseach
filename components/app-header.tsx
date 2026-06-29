import Image from "next/image";
import { AppHeaderNav } from "@/components/app-header-nav";
import { formatDateLong } from "@/lib/format";

type Tab = "research" | "trades";

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

/** Header compartilhado Research / Execução — grid 3 colunas para nav central fixo. */
export function AppHeader({ active, subtitle, lastUpdate }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-navy text-surface-soft border-b border-ink/30">
      <div className="mx-auto max-w-[1600px] h-16 px-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-sm bg-surface-soft grid place-items-center overflow-hidden">
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
            <span className="font-display text-[17px] tracking-tight truncate">
              Finacap Research
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-surface-soft/60 mt-1 truncate">
              {subtitle}
            </span>
          </div>
        </div>

        <AppHeaderNav active={active} />

        <div className="flex flex-col items-end text-right leading-tight justify-self-end w-[180px] shrink-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-surface-soft/60">
            Última atualização
          </div>
          <div className="font-mono text-sm tabular mt-1">
            {formatLastUpdate(lastUpdate)}
          </div>
        </div>
      </div>
    </header>
  );
}
