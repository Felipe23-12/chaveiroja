import React from "react";
import { HandCoins, Building2 } from "lucide-react";

/** Mostra a divisão do faturamento: quanto ficou com o chaveiro e quanto foi para a plataforma. */
export default function EarningsSplitCard({ gross = 0, net = 0, platform = 0 }) {
  const total = Number(gross) || 0;
  const mine = Number(net) || 0;
  const app = Number(platform) || 0;
  const minePct = total > 0 ? Math.round((mine / total) * 100) : 0;

  return (
    <div className="p-4 rounded-2xl border border-border bg-card mb-6">
      <p className="text-sm font-semibold text-foreground mb-3">
        Divisão do faturamento · bruto R$ {total.toFixed(2)}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <HandCoins className="w-4 h-4" />
            <span className="text-xs font-medium">Você ganhou</span>
          </div>
          <p className="font-heading font-bold text-xl text-emerald-700">R$ {mine.toFixed(2)}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">{minePct}% do faturamento</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/60 border border-border">
          <div className="flex items-center gap-2 text-foreground mb-1">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Plataforma</span>
          </div>
          <p className="font-heading font-bold text-xl text-foreground">R$ {app.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{100 - minePct}% do faturamento</p>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden flex">
        <div className="bg-emerald-500 h-full" style={{ width: `${minePct}%` }} />
        <div className="bg-foreground/30 h-full" style={{ width: `${100 - minePct}%` }} />
      </div>
    </div>
  );
}