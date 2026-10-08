import React from "react";

const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VehicleKeyLaborPreview({ pricing }) {
  const labor = Number(pricing?.fields?.base_labor_cost);
  if (!Number.isFinite(labor) || labor <= 0) return null;
  return (
    <section aria-label="Prévia da mão de obra" className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
      <p className="text-sm text-muted-foreground">Prévia da mão de obra (67%)</p>
      <p className="font-heading text-2xl font-bold text-primary">{money(labor * 0.67)}</p>
      <p className="text-sm text-foreground">Atenção: esta prévia mostra apenas 67% da mão de obra calculada, não é o valor final nem um desconto. Os 33% restantes e os demais custos do serviço não estão incluídos neste valor.</p>
    </section>
  );
}