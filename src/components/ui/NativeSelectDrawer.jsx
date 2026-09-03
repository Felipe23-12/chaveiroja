import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Select estilizado como bottom drawer (estilo nativo mobile).
 * Substitui o <select> nativo por um botão que abre uma folha inferior,
 * mantendo alvos de toque de no mínimo 44px.
 */
export default function NativeSelectDrawer({
  value,
  onChange,
  options = [],
  label,
  placeholder = "Selecione",
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-input bg-background text-sm min-h-[44px] select-none touch-manipulation"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="select-none pb-safe">
          <SheetHeader>
            <SheetTitle>{label || "Selecione uma opção"}</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-sm min-h-[44px] transition-colors touch-manipulation ${
                  o.value === value
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {o.label}
                {o.value === value && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}