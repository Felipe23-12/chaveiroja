import React from "react";
import { ShieldCheck } from "lucide-react";

export default function LocksmithScoreCard({ score }) {
  const value = Math.max(0, Math.min(10, Number(score?.score ?? 10)));
  return (
    <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div>
      <div className="flex-1"><p className="text-sm font-semibold text-foreground">Score profissional: {value.toFixed(1)} / 10</p><p className="text-xs text-muted-foreground">Aceites não somam pontos · −1 a cada 3 recusas · −1 por cancelamento após aceite</p></div>
      <span className="text-xs font-semibold text-muted-foreground">{value <= 3 ? "Recuperação" : "Prioritário"}</span>
    </div>
  );
}