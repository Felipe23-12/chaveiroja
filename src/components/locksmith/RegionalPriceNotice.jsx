import React from "react";
import { useServiceQuoteScope } from '@/components/location/ServiceQuoteScope';
import { MapPin } from "lucide-react";

const brl = (v) => `R$ ${Number(v || 0).toFixed(2)}`;

/**
 * Mostra a base regional usada no cálculo: capital de referência, distância e
 * a faixa de valores observada, com o aviso obrigatório de que é referência.
 */
export default function RegionalPriceNotice({ regional }) {
  const { allowed } = useServiceQuoteScope();
  if (!allowed || !regional?.reference) return null;
  const r = regional.reference;

  return (
    <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-1.5">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs font-medium text-foreground">{regional.label}</p>
        <span
          className={
            r.dado_local
              ? "text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700"
              : "text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
          }
        >
          {r.dado_local ? "Dados locais publicados" : "Estimativa regional"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {r.servico_nome} · média de referência {brl(r.preco_medio_brl)} · faixa{" "}
        {brl(r.preco_minimo_brl)} a {brl(r.preco_maximo_brl)} ·{" "}
        {regional.distanceKm.toFixed(0)} km de {r.capital}
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Valor de referência. O preço final pode variar conforme horário, distância, dificuldade,
        danos, peças e modelo do veículo ou fechadura.
      </p>
    </div>
  );
}