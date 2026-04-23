"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[220px] justify-between"
          >
            {selected.length > 0
              ? `${selected.length} empresa${selected.length > 1 ? "s" : ""} selecionada${
                  selected.length > 1 ? "s" : ""
                }`
              : "Buscar empresas..."}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
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

      {selected.map((s) => (
        <Badge
          key={s}
          className="pl-2 pr-1 font-mono flex items-center gap-1 bg-brand text-surface-soft"
        >
          {s}
          <button
            type="button"
            onClick={() => remove(s)}
            className="ml-0.5 rounded-sm hover:bg-brand-soft/60 p-0.5"
            aria-label={`Remover ${s}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
