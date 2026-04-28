"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectorPt } from "@/lib/sector-labels";

interface Props {
  options: string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

// Filtro simples por setor (single-select).
// O value guarda o setor bruto vindo do banco; o label exibido e traduzido.
export function SectorFilter({ options, value, onChange }: Props) {
  return (
    <Select
      value={value ?? "__all__"}
      onValueChange={(next) => onChange(next === "__all__" ? undefined : next)}
    >
      <SelectTrigger
        className="h-10 w-[220px] border-line bg-surface-soft text-sm text-ink/60 hover:border-brand-soft"
      >
        <SelectValue placeholder="Todos setores" className="text-ink/60" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">Todos setores</SelectItem>
        {options.map((sector) => (
          <SelectItem key={sector} value={sector}>
            {sectorPt(sector)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
