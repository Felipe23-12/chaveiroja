import React from "react";
import { CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const PARTS = ["Miolo", "Haste", "Cilindro", "Fechadura", "Maçaneta", "Chave ou controle"];

export default function PartsChecklist({ value = [], onChange }) {
  const toggle = (part, checked) => {
    const next = checked ? [...new Set([...value, part])] : value.filter((item) => item !== part);
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Peças substituídas</p>
          <p className="text-xs text-muted-foreground">Marque os itens trocados neste atendimento.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PARTS.map((part) => (
          <label key={part} className="flex items-center gap-2 min-h-[44px] rounded-lg border border-border bg-card px-3 text-sm text-foreground">
            <Checkbox checked={value.includes(part)} onCheckedChange={(checked) => toggle(part, checked === true)} />
            {part}
          </label>
        ))}
      </div>
    </div>
  );
}