import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import RemoteCompatibilityForm from "./RemoteCompatibilityForm";
import RemoteCompatibilityTable from "./RemoteCompatibilityTable";

const empty = { vehicle_catalog_id: "", universal_remote_id: "", file_name: "", pairing_method: "not_confirmed", verified: false, active: false };
export default function RemoteCompatibilityPanel({ vehicles }) {
  const [rows, setRows] = useState([]); const [remotes, setRemotes] = useState([]); const [form, setForm] = useState(empty); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const loadRows = () => base44.entities.VehicleRemoteCompatibility.list("vehicle_label", 1000).then(setRows);
  const loadRemotes = () => base44.entities.UniversalRemote.filter({ pcf_type: "sem_pcf" }, "platform", 500).then(setRemotes);
  useEffect(() => { loadRows(); loadRemotes(); const reload = () => loadRemotes(); window.addEventListener("universal-remotes-changed", reload); return () => window.removeEventListener("universal-remotes-changed", reload); }, []);
  const save = async () => {
    if (saving) return; const vehicle = vehicles.find((v) => v.id === form.vehicle_catalog_id); const remote = remotes.find((r) => r.id === form.universal_remote_id); if (!vehicle || !remote) return;
    setSaving(true); setError(""); const data = { vehicle_catalog_id: vehicle.id, vehicle_label: `${vehicle.make} ${vehicle.model} ${vehicle.year_start || ""}–${vehicle.year_end || ""}`.trim(), universal_remote_id: remote.id, platform: remote.platform, remote_model: remote.model, file_name: form.file_name.trim(), pairing_method: form.pairing_method, procedure: form.procedure?.trim() || "", frequency_mhz: Number(form.frequency_mhz) || undefined, button_count: Number(form.button_count) || undefined, verified: !!form.verified, active: !!form.active };
    try { if (form.id) await base44.entities.VehicleRemoteCompatibility.update(form.id, data); else await base44.entities.VehicleRemoteCompatibility.create(data); setForm(empty); await loadRows(); }
    catch (err) { setError(err.message || "Não foi possível salvar a compatibilidade."); }
    finally { setSaving(false); }
  };
  return <section className="space-y-3 rounded-xl border border-border bg-card p-3">
    <div><h3 className="font-heading font-semibold">Arquivos e apresentação por veículo</h3><p className="text-xs text-muted-foreground">Relacione um telecomando sem PCF ao arquivo gerado e ao procedimento confirmado.</p></div>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <RemoteCompatibilityForm value={form} vehicles={vehicles} remotes={remotes} onChange={setForm} onSave={save} saving={saving} />
    <RemoteCompatibilityTable rows={rows} onEdit={setForm} onDelete={async (id) => { await base44.entities.VehicleRemoteCompatibility.delete(id); await loadRows(); }} />
  </section>;
}