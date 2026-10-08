import React from "react";

const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VehicleKeyLaborPreview({ pricing }) {
  const labor = Number(pricing?.fields?.base_labor_cost);
  if (!Number.isFinite(labor) || labor <= 0) return null;
  return (
    <section aria-label="Prévia da mão de obra" className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
      <p className="text-sm text-muted-foreground">Valor médio da mão de obra</p>
      <p className="font-heading text-2xl font-bold text-primary">{money(labor)}</p>
      <p className="text-sm text-foreground">Atenção: este valor é apenas uma prévia da mão de obra, não é o valor final do serviço. O total pode variar conforme as condições do serviço e custos adicionais.</p>
    </section>
  );
}