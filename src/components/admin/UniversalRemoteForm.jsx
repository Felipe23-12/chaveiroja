import React from "react";
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UniversalRemoteForm({ value, onChange, onSave, saving }) {
  const set = (field, next) => onChange({ ...value, [field]: next });
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
    <NativeSelectDrawer label="Plataforma" value={value.platform || 'KD'} onChange={next => set('platform', next)} options={['KD', 'VVDI', 'KM100'].map(item => ({ value: item, label: item }))} />
    <Input placeholder="Modelo físico (ex.: B15)" value={value.model || ""} onChange={(e) => set("model", e.target.value)} />
    <Input placeholder="Nome de exibição" value={value.display_name || ""} onChange={(e) => set("display_name", e.target.value)} />
    <NativeSelectDrawer label="Tipo de PCF" value={value.pcf_type || 'sem_pcf'} onChange={next => set('pcf_type', next)} options={[{ value: 'sem_pcf', label: 'Sem PCF' }, { value: 'com_pcf', label: 'Com PCF' }, { value: 'nao_confirmado', label: 'PCF não confirmado' }]} />
    <Input type="number" placeholder="Preço normal" value={value.list_price ?? ""} onChange={(e) => set("list_price", e.target.value)} />
    <Input type="number" placeholder="Preço Pix" value={value.pix_price ?? ""} onChange={(e) => set("pix_price", e.target.value)} />
    <Input className="lg:col-span-2" placeholder="Link da fonte" value={value.source_url || ""} onChange={(e) => set("source_url", e.target.value)} />
    <div className="flex flex-wrap gap-3 items-center text-sm">
      <label><input type="checkbox" checked={value.available ?? true} onChange={(e) => set("available", e.target.checked)} /> Disponível</label>
      <label><input type="checkbox" checked={value.verified || false} onChange={(e) => set("verified", e.target.checked)} /> Verificado</label>
    </div>
    <Button onClick={onSave} disabled={saving || !value.model}>{saving ? "Salvando..." : "Salvar telecomando"}</Button>
  </div>;
}