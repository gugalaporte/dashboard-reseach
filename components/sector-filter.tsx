"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  options: string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

// Filtro simples por setor. Label = nome do banco (LSEG), sem traduzir.
export function SectorFilter({ options, value, onChange }: Props) {
  return (
    <Select
      value={value ?? "__all__"}
      onValueChange={(next) => onChange(next === "__all__" ? undefined : next)}
    >
      <SelectTrigger
        className="h-10 w-full sm:w-[220px] border-line bg-surface-soft text-sm text-ink/60 hover:border-brand-soft"
      >
        <SelectValue placeholder="Todos setores" className="text-ink/60" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">Todos setores</SelectItem>
        {options.map((sector) => (
          <SelectItem key={sector} value={sector}>
            {sector}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
