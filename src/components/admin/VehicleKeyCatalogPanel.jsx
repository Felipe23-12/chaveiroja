import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CAR_MAKES } from "@/data/carModels";
import { MOTO_BRANDS, MOTO_MODELS } from "@/lib/motoKey";
import { Button } from "@/components/ui/button";
import VehicleKeyCatalogForm from "./VehicleKeyCatalogForm";
import VehicleKeyCatalogTable from "./VehicleKeyCatalogTable";
import UniversalRemoteCatalogPanel from "./UniversalRemoteCatalogPanel";
import RemoteCompatibilityPanel from "./RemoteCompatibilityPanel";

const empty = { vehicle_type: "carro", make: "", model: "", key_style: "nao_confirmado", factory_alarm_status: "nao_confirmado", transponder_status: "nao_confirmado", programming_machine: "", verified: false, active: false };
export default function VehicleKeyCatalogPanel() {
  const [rows, setRows] = useState([]); const [form, setForm] = useState(empty); const [saving, setSaving] = useState(false); const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const all = [];
    let page;
    do {
      page = await base44.entities.VehicleKeyCatalog.list("make", 500, all.length);
      all.push(...page);
    } while (page.length === 500);
    setRows(all);
  };
  useEffect(() => { load(); }, []);
  const initialize = async () => {
    const known = new Set(rows.map((r) => `${r.vehicle_type}|${r.make}|${r.model}`));
    const cars = CAR_MAKES.flatMap((make) => make.models.map((model) => ({ vehicle_type: "carro", make: make.label, model, key_style: "nao_confirmado", verified: false, active: false })));
    const motos = MOTO_BRANDS.flatMap((brand) => (MOTO_MODELS[brand.id] || []).map((model) => ({ vehicle_type: "moto", make: brand.label, model: model.label, key_style: "nao_confirmado", verified: false, active: false })));
    const missing = [...cars, ...motos].filter((r) => !known.has(`${r.vehicle_type}|${r.make}|${r.model}`));
    if (missing.length) await base44.entities.VehicleKeyCatalog.bulkCreate(missing); await load();
  };
  const save = async () => {
    if (saving) return;
    setError("");
    if (form.active && form.verified && form.transponder_status === "presente" && !form.programming_machine?.trim()) {
      setError("Informe a máquina de codificação antes de publicar uma ficha com transponder confirmado.");
      return;
    }
    setSaving(true);
    try {
      const data = { vehicle_type: form.vehicle_type, make: form.make, model: form.model, year_start: Number(form.year_start) || undefined, year_end: Number(form.year_end) || undefined, key_style: form.key_style, transponder: form.transponder || "", blade: form.blade || "", original_price: Number(form.original_price) || 0, parallel_simple_price: Number(form.parallel_simple_price) || 0, parallel_flip_price: Number(form.parallel_flip_price) || 0, parallel_proximity_price: Number(form.parallel_proximity_price) || 0, vvdi_supported: !!form.vvdi_supported, vvdi_file: form.vvdi_file || "", vvdi_price: Number(form.vvdi_price) || 0, kd_supported: !!form.kd_supported, kd_file: form.kd_file || "", kd_price: Number(form.kd_price) || 0, km100_supported: !!form.km100_supported, km100_file: form.km100_file || "", km100_price: Number(form.km100_price) || 0, source_url: form.source_url || "", verified: !!form.verified, active: !!form.active,
        catalog_code: form.catalog_code || "", key_type_detail: form.key_type_detail || "", frequency_mhz: form.frequency_mhz || "",
        factory_alarm_status: form.factory_alarm_status || "nao_confirmado",
        transponder_status: form.transponder_status || "nao_confirmado",
        programming_machine: form.transponder_status === "presente" ? form.programming_machine?.trim() || "" : "",
        manual_price_updated_at: new Date().toISOString(),
      };
      if (form.id) await base44.entities.VehicleKeyCatalog.update(form.id, data);
      else await base44.entities.VehicleKeyCatalog.create(data);
      setForm(empty);
      await load();
    } catch (err) {
      setError(err.message || "Não foi possível salvar a ficha técnica.");
    } finally { setSaving(false); }
  };
  const visible = useMemo(() => rows.filter((r) => `${r.make} ${r.model}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);
  return <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-heading font-semibold text-lg">Catálogo técnico de chaves</h2><p className="text-xs text-muted-foreground">Publique somente dados conferidos no equipamento ou fonte oficial.</p></div><Button variant="outline" onClick={initialize}>Adicionar modelos existentes</Button></div><input className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Buscar veículo" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="rounded-xl border border-border bg-card p-3">{error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}<VehicleKeyCatalogForm value={form} onChange={setForm} onSave={save} saving={saving} /></div><VehicleKeyCatalogTable rows={visible} onEdit={setForm} onDelete={async (id) => { await base44.entities.VehicleKeyCatalog.delete(id); load(); }} /><UniversalRemoteCatalogPanel /><RemoteCompatibilityPanel vehicles={rows} /></section>;
}