import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import UniversalRemoteForm from "./UniversalRemoteForm";
import UniversalRemoteTable from "./UniversalRemoteTable";

const empty = { platform: "KD", model: "", pcf_type: "sem_pcf", available: true, verified: false };
export default function UniversalRemoteCatalogPanel() {
  const [rows, setRows] = useState([]); const [form, setForm] = useState(empty); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const load = () => base44.entities.UniversalRemote.list("platform", 500).then(setRows);
  useEffect(() => { load(); }, []);
  const changed = async () => { await load(); window.dispatchEvent(new Event("universal-remotes-changed")); };
  const save = async () => {
    if (saving) return; setSaving(true); setError("");
    const data = { platform: form.platform, model: form.model.trim(), display_name: form.display_name?.trim() || "", pcf_type: form.pcf_type, list_price: Number(form.list_price) || 0, pix_price: Number(form.pix_price) || 0, source_url: form.source_url?.trim() || "", source_checked_at: new Date().toISOString().slice(0, 10), available: !!form.available, verified: !!form.verified };
    try { if (form.id) await base44.entities.UniversalRemote.update(form.id, data); else await base44.entities.UniversalRemote.create(data); setForm(empty); await changed(); }
    catch (err) { setError(err.message || "Não foi possível salvar o telecomando."); }
    finally { setSaving(false); }
  };
  return <section className="space-y-3 rounded-xl border border-border bg-card p-3">
    <div><h3 className="font-heading font-semibold">Telecomandos universais</h3><p className="text-xs text-muted-foreground">O preço pertence ao modelo físico, não ao veículo.</p></div>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <UniversalRemoteForm value={form} onChange={setForm} onSave={save} saving={saving} />
    <UniversalRemoteTable rows={rows} onEdit={setForm} onDelete={async (id) => { await base44.entities.UniversalRemote.delete(id); await changed(); }} />
  </section>;
}