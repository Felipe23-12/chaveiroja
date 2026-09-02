import React from "react";
import { Gift, Sparkles, Trophy } from "lucide-react";

export default function PointsProgressCard({ loyalty }) {
  if (!loyalty) return null;

  const { completedCount, available, progress, next } = loyalty;
  const pct = Math.min(100, (progress / next) * 100);

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

      {/* Aviso de desconto liberado */}
      {available > 0 ? (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <Gift className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Desconto de 10% liberado!
            </p>
            <p className="text-xs text-emerald-600/90">
              Você tem {available} {available === 1 ? "desconto disponível" : "descontos disponíveis"} para usar no próximo pedido.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Progresso para o próximo desconto
            </span>
            <span>{progress}/{next}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Conclua mais {next - progress} {next - progress === 1 ? "serviço" : "serviços"} para liberar 10% off no próximo pedido.
          </p>
        </div>
      )}
    </div>
  );
}