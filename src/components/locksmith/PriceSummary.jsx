import React from "react";
import { Clock } from "lucide-react";

export default function PriceSummary({ price }) {
  if (!price) return null;
  return (
    <div className="rounded-2xl bg-muted p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Clock className="w-3.5 h-3.5" />
        {price.timeTier.label}
      </div>
      {price.breakdown.map((item, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium text-foreground">R$ {item.value.toFixed(2)}</span>
        </div>
      ))}
      <div className="border-t border-border pt-2 flex justify-between items-center">
        <span className="font-heading font-semibold text-foreground">Total ofertado</span>
        <span className="font-heading font-bold text-lg text-primary">R$ {price.total.toFixed(2)}</span>
      </div>
    </div>
  );
}