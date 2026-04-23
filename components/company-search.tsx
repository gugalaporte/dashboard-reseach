"use client";

import * as React from "react";
import { Check, Search, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function CompanySearch({ options, selected, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Hotkey "/" abre o popover (padrao GitHub/Linear/Koyfin).
  // Ignora se usuario esta digitando em outro input.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const editable =
        tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable;
      if (editable) return;
      e.preventDefault();
      setOpen(true);
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "group flex items-center gap-2 h-10 px-3 rounded-md border border-line bg-surface-soft",
            "hover:border-brand-soft transition text-left w-full max-w-md",
            "focus:outline-none focus:ring-2 focus:ring-brand-soft"
          )}
        >
          <Search className="w-4 h-4 text-ink/40 group-hover:text-brand" />
          <span className="text-sm text-ink/60">
            {selected.length > 0
              ? `${selected.length} selecionada${selected.length > 1 ? "s" : ""}`
              : "Buscar empresas..."}
          </span>
          <kbd className="ml-auto text-[10px] font-mono text-ink/40 border border-line rounded px-1.5 py-0.5">
            /
          </kbd>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite o ticker..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSel = selected.includes(opt);
                return (
                  <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSel ? "opacity-100 text-brand" : "opacity-0"
                      )}
                    />
                    <span className="font-mono">{opt}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Chips das empresas selecionadas, renderizadas fora da barra (abaixo).
export function CompanyChips({
  selected,
  onRemove,
}: {
  selected: string[];
  onRemove: (value: string) => void;
}) {
  if (selected.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-sm bg-navy/5 border border-navy/10 font-mono text-[11px] tracking-wide text-navy"
        >
          {s}
          <button
            type="button"
            onClick={() => onRemove(s)}
            className="rounded-sm hover:bg-navy/10 p-0.5"
            aria-label={`Remover ${s}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
