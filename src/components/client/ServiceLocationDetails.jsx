import React from "react";
import { Input } from "@/components/ui/input";
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';

export default function ServiceLocationDetails({ value, onChange, vehicle }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h3 className="text-sm font-semibold">Identificação do local do atendimento</h3>
    {vehicle ? <label className="block space-y-1 text-sm">Placa do veículo (opcional)
      <Input value={value.vehicle_plate || ""} maxLength={8} onChange={(e) => update("vehicle_plate", e.target.value.toUpperCase())} placeholder="ABC1D23" />
    </label> : <>
      <label className="block space-y-1 text-sm">Tipo de imóvel
        <NativeSelectDrawer label="Tipo de imóvel" value={value.place_type || ''} onChange={next => onChange({ ...value, place_type: next, building: '', unit: '' })} options={[
          { value: '', label: 'Selecione', disabled: true }, { value: 'individual', label: 'Casa ou imóvel independente' }, { value: 'condominium', label: 'Condomínio / prédio com várias unidades' }, { value: 'unknown', label: 'Não sei informar' },
        ]} />
      </label>
      {value.place_type === "condominium" && <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Bloco / torre<Input value={value.building || ""} maxLength={80} onChange={(e) => update("building", e.target.value)} placeholder="Ex.: A, ou Único" /></label>
        <label className="space-y-1 text-sm">Apartamento / unidade<Input value={value.unit || ""} maxLength={80} onChange={(e) => update("unit", e.target.value)} placeholder="Ex.: 102" /></label>
      </div>}
    </>}
    <p className="text-xs text-muted-foreground">Apartamentos e veículos diferentes são atendimentos distintos. A proximidade no mapa, sozinha, não gera bloqueio de segurança.</p>
  </section>;
}