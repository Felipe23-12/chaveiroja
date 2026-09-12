import React from "react";
import { Input } from "@/components/ui/input";

export default function ServiceLocationDetails({ value, onChange, vehicle }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h3 className="text-sm font-semibold">Identificação do local do atendimento</h3>
    {vehicle ? <label className="block space-y-1 text-sm">Placa do veículo (opcional)
      <Input value={value.vehicle_plate || ""} maxLength={8} onChange={(e) => update("vehicle_plate", e.target.value.toUpperCase())} placeholder="ABC1D23" />
    </label> : <>
      <label className="block space-y-1 text-sm">Tipo de imóvel
        <select value={value.place_type || ""} onChange={(e) => onChange({ ...value, place_type: e.target.value, building: "", unit: "" })} className="min-h-[44px] w-full rounded-md border border-input bg-background p-2 text-foreground">
          <option value="" disabled>Selecione</option><option value="individual">Casa ou imóvel independente</option><option value="condominium">Condomínio / prédio com várias unidades</option><option value="unknown">Não sei informar</option>
        </select>
      </label>
      {value.place_type === "condominium" && <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Bloco / torre<Input value={value.building || ""} maxLength={80} onChange={(e) => update("building", e.target.value)} placeholder="Ex.: A, ou Único" /></label>
        <label className="space-y-1 text-sm">Apartamento / unidade<Input value={value.unit || ""} maxLength={80} onChange={(e) => update("unit", e.target.value)} placeholder="Ex.: 102" /></label>
      </div>}
    </>}
    <p className="text-xs text-muted-foreground">Apartamentos e veículos diferentes são atendimentos distintos. A proximidade no mapa, sozinha, não gera bloqueio de segurança.</p>
  </section>;
}