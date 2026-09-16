import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import KeyProgrammingFields from "@/components/admin/KeyProgrammingFields";

const fields = [
  ["make", "Montadora"], ["model", "Modelo"], ["year_start", "Ano inicial"], ["year_end", "Ano final"],
  ["catalog_code", "Código da chave"], ["key_type_detail", "Produto / botões"], ["frequency_mhz", "Frequência (MHz)"],
  ["transponder", "Chip/transponder"], ["blade", "Lâmina"], ["original_price", "Preço original"],
  ["vvdi_file", "Arquivo VVDI"], ["vvdi_price", "Preço VVDI"], ["kd_file", "Arquivo KD"], ["kd_price", "Preço KD"],
  ["km100_file", "Arquivo KM100"], ["km100_price", "Preço KM100"], ["source_url", "Fonte pública"],
];

export default function VehicleKeyCatalogForm({ value, onChange, onSave, saving }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      <select value={value.vehicle_type || "carro"} onChange={(e) => onChange({ ...value, vehicle_type: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="carro">Carro</option><option value="moto">Moto</option>
      </select>
      <select value={value.key_style || "nao_confirmado"} onChange={(e) => onChange({ ...value, key_style: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="nao_confirmado">Arquitetura não confirmada</option><option value="lamina_sem_pcf">Lâmina sem PCF</option><option value="canivete_sem_pcf">Canivete sem PCF</option><option value="pcf_integrado">PCF integrado</option><option value="presenca">Presença</option>
      </select>
      <select value={value.factory_alarm_status || "nao_confirmado"} onChange={(e) => onChange({ ...value, factory_alarm_status: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="nao_confirmado">Alarme de fábrica não confirmado</option><option value="original">Possui alarme original</option><option value="ausente">Sem alarme original</option>
      </select>
      <KeyProgrammingFields value={value} onChange={onChange} />
      {fields.map(([name, label]) => <Input key={name} type={name.includes("price") || name.includes("year") ? "number" : "text"} placeholder={label} value={value[name] ?? ""} onChange={(e) => onChange({ ...value, [name]: e.target.value })} />)}
      {["vvdi", "kd", "km100"].map((brand) => <label key={brand} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value[`${brand}_supported`] || false} onChange={(e) => onChange({ ...value, [`${brand}_supported`]: e.target.checked })} /> {brand.toUpperCase()} possui arquivo</label>)}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.verified || false} onChange={(e) => onChange({ ...value, verified: e.target.checked })} /> Dados verificados</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.active || false} onChange={(e) => onChange({ ...value, active: e.target.checked })} /> Disponível ao cliente</label>
      <Button onClick={onSave} disabled={saving || !value.make || !value.model}>{saving ? "Salvando..." : "Salvar ficha"}</Button>
    </div>
  );
}