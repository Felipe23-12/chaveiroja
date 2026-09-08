import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RemoteCompatibilityForm({ value, vehicles, remotes, onChange, onSave, saving }) {
  const set = (field, next) => onChange({ ...value, [field]: next });
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
    <select value={value.vehicle_catalog_id || ""} onChange={(e) => set("vehicle_catalog_id", e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
      <option value="">Selecione o veículo</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year_start || ""}–{v.year_end || ""}</option>)}
    </select>
    <select value={value.universal_remote_id || ""} onChange={(e) => set("universal_remote_id", e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
      <option value="">Selecione o telecomando</option>{remotes.map((r) => <option key={r.id} value={r.id}>{r.platform} {r.model} — R$ {Number(r.list_price || 0).toFixed(2)}</option>)}
    </select>
    <Input placeholder="Nome exato do arquivo gerado" value={value.file_name || ""} onChange={(e) => set("file_name", e.target.value)} />
    <select value={value.pairing_method || "not_confirmed"} onChange={(e) => set("pairing_method", e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
      <option value="not_confirmed">Apresentação não confirmada</option><option value="manual">Procedimento manual</option><option value="diagnostic">Via diagnóstico</option><option value="both">Manual ou diagnóstico</option>
    </select>
    <Input type="number" placeholder="Frequência MHz" value={value.frequency_mhz ?? ""} onChange={(e) => set("frequency_mhz", e.target.value)} />
    <Input type="number" placeholder="Quantidade de botões" value={value.button_count ?? ""} onChange={(e) => set("button_count", e.target.value)} />
    <Input className="sm:col-span-2" placeholder="Procedimento de apresentação" value={value.procedure || ""} onChange={(e) => set("procedure", e.target.value)} />
    <div className="flex gap-3 items-center text-sm"><label><input type="checkbox" checked={value.verified || false} onChange={(e) => set("verified", e.target.checked)} /> Verificado</label><label><input type="checkbox" checked={value.active || false} onChange={(e) => set("active", e.target.checked)} /> Ativo</label></div>
    <Button onClick={onSave} disabled={saving || !value.vehicle_catalog_id || !value.universal_remote_id || !value.file_name}>{saving ? "Salvando..." : "Salvar compatibilidade"}</Button>
  </div>;
}