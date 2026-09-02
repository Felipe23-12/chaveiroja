import React from "react";
import { Gift, Sparkles, Trophy, PartyPopper } from "lucide-react";

export default function PointsProgressCard({ loyalty }) {
  if (!loyalty) return null;

  const { completedCount, available, progress, next } = loyalty;
  const pct = Math.min(100, (progress / next) * 100);
  const remaining = next - progress;
  const justReached = progress === 0 && completedCount >= next && available > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-heading font-semibold text-sm text-foreground">
            Programa de fidelidade
          </p>
          <p className="text-xs text-muted-foreground">
            {completedCount} {completedCount === 1 ? "serviço concluído" : "serviços concluídos"}
          </p>
        </div>
      </div>

      {/* Aviso de desconto liberado — destaque máximo */}
      {available > 0 ? (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 animate-pulse">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <PartyPopper className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-heading font-bold text-base text-white">
                🎉 Desconto de 10% liberado!
              </p>
              <p className="text-xs text-white/90 mt-0.5">
                Você concluiu {next} serviços e ganhou {available} {available === 1 ? "desconto disponível" : "descontos disponíveis"} para usar no próximo pedido.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Progresso para o próximo desconto
            </span>
            <span className="font-medium text-foreground">{progress}/{next}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm font-medium text-foreground mt-2">
            Faltam apenas <span className="text-primary font-bold">{remaining}</span> {remaining === 1 ? "serviço" : "serviços"} para liberar 10% off no próximo pedido.
          </p>
        </div>
      )}
    </div>
  );
}