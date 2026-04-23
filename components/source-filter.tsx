"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONTES } from "@/types/research";

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

const ALL = "__all__";

export function SourceFilter({ value, onChange }: Props) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => onChange(v === ALL ? undefined : v)}
    >
      <SelectTrigger className="min-w-[160px]">
        <SelectValue placeholder="Fonte" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todas as fontes</SelectItem>
        {FONTES.map((f) => (
          <SelectItem key={f} value={f}>
            {f}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
