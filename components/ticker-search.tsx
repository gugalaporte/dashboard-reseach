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

type Props = {
  options: string[];
  value: string;
  onChange: (ticker: string) => void;
  placeholder?: string;
};

/** Busca digitável de 1 ticker (combobox). */
export function TickerSearch({
  options,
  value,
  onChange,
  placeholder = "Digite o ticker…",
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2 w-full max-w-sm">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex items-center gap-2 h-10 px-3 rounded-md border border-line bg-surface",
              "hover:border-brand-soft transition text-left flex-1 min-w-0",
              "focus:outline-none focus:ring-2 focus:ring-brand-soft"
            )}
          >
            <Search className="w-4 h-4 text-ink/40 shrink-0" />
            <span
              className={cn(
                "text-sm truncate",
                value ? "font-mono text-ink font-medium" : "text-ink/50"
              )}
            >
              {value || placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="PETR4, VALE3…" />
            <CommandList>
              <CommandEmpty>Nenhum ticker encontrado.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt ? "opacity-100 text-brand" : "opacity-0"
                      )}
                    />
                    <span className="font-mono">{opt}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          aria-label="Limpar ticker"
          onClick={() => onChange("")}
          className="h-10 w-10 shrink-0 grid place-items-center rounded-md border border-line text-ink/40 hover:text-ink hover:border-brand-soft transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
