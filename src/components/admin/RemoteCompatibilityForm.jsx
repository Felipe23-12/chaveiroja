import React from "react";
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RemoteCompatibilityForm({ value, vehicles, remotes, onChange, onSave, saving }) {
  const set = (field, next) => onChange({ ...value, [field]: next });
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
    <NativeSelectDrawer label="Veículo" value={value.vehicle_catalog_id || ''} onChange={next => set('vehicle_catalog_id', next)} options={[{ value: '', label: 'Selecione o veículo' }, ...vehicles.map(v => ({ value: v.id, label: `${v.make} ${v.model} ${v.year_start || ''}–${v.year_end || ''}` }))]} />
    <NativeSelectDrawer label="Telecomando" value={value.universal_remote_id || ''} onChange={next => set('universal_remote_id', next)} options={[{ value: '', label: 'Selecione o telecomando' }, ...remotes.map(r => ({ value: r.id, label: `${r.platform} ${r.model} — R$ ${Number(r.list_price || 0).toFixed(2)}` }))]} />
    <Input placeholder="Nome exato do arquivo gerado" value={value.file_name || ""} onChange={(e) => set("file_name", e.target.value)} />
    <NativeSelectDrawer label="Método de apresentação" value={value.pairing_method || 'not_confirmed'} onChange={next => set('pairing_method', next)} options={[
      { value: 'not_confirmed', label: 'Apresentação não confirmada' }, { value: 'manual', label: 'Procedimento manual' }, { value: 'diagnostic', label: 'Via diagnóstico' }, { value: 'both', label: 'Manual ou diagnóstico' },
    ]} />
    <Input type="number" placeholder="Frequência MHz" value={value.frequency_mhz ?? ""} onChange={(e) => set("frequency_mhz", e.target.value)} />
    <Input type="number" placeholder="Quantidade de botões" value={value.button_count ?? ""} onChange={(e) => set("button_count", e.target.value)} />
    <Input className="sm:col-span-2" placeholder="Procedimento de apresentação" value={value.procedure || ""} onChange={(e) => set("procedure", e.target.value)} />
    <div className="flex gap-3 items-center text-sm"><label><input type="checkbox" checked={value.verified || false} onChange={(e) => set("verified", e.target.checked)} /> Verificado</label><label><input type="checkbox" checked={value.active || false} onChange={(e) => set("active", e.target.checked)} /> Ativo</label></div>
    <Button onClick={onSave} disabled={saving || !value.vehicle_catalog_id || !value.universal_remote_id || !value.file_name}>{saving ? "Salvando..." : "Salvar compatibilidade"}</Button>
  </div>;
}