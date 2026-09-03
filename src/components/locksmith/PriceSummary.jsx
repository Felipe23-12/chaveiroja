import React from "react";
import { Clock, Info } from "lucide-react";

export default function PriceSummary({ price }) {
  if (!price) return null;
  return (
    <div className="rounded-2xl bg-muted p-4 space-y-2">
      {price.timeTier && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Clock className="w-3.5 h-3.5" />
          {price.timeTier.label}
        </div>
      )}
      {price.breakdown.map((item, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          {item.isAdjustment ? (
            <span className={`font-medium ${item.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {item.value >= 0 ? "+" : "-"}R$ {Math.abs(item.value).toFixed(2)}
            </span>
          ) : (
            <span className="font-medium text-foreground">R$ {item.value.toFixed(2)}</span>
          )}
        </div>
      ))}
      <div className="border-t border-border pt-2 flex justify-between items-center">
        <span className="font-heading font-semibold text-foreground">Total estimado</span>
        <span className="font-heading font-bold text-lg text-primary">R$ {price.total.toFixed(2)}</span>
      </div>
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Valor estimado. O valor final pode variar conforme a distância até o chaveiro e condições do serviço.</span>
      </div>
    </div>
  );
}