import React from "react";

/**
 * Indicador de progresso profissional com rótulos.
 * Mostra barras preenchidas + nome da etapa atual,
 * substituindo o indicador de barras mudas.
 */
const STEP_LABELS = {
  1: "Serviço",
  2: "Detalhes",
  3: "Busca",
  4: "Aceito",
  5: "Acompanhando",
  6: "Finalizar",
  7: "Pagamento",
  8: "Avaliação",
};

export default function StepProgress({ step, total = 8 }) {
  const currentLabel = STEP_LABELS[step] || "";
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          Etapa {step} de {total}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {currentLabel}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              step >= n
                ? step === n
                  ? "bg-primary h-2"
                  : "bg-primary"
                : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}