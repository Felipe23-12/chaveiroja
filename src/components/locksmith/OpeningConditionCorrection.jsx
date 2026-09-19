import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PhotoUploader from "@/components/locksmith/PhotoUploader";
import { hasLocksmithConditionCorrection, isOpeningRequest } from "@/lib/openingCondition";

export default function OpeningConditionCorrection({ request, onApplied }) {
  const [conditions, setConditions] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!isOpeningRequest(request) || hasLocksmithConditionCorrection(request)) return null;
  const toggle = (id) => setConditions((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  const apply = async () => {
    if (!conditions.length || !photos.length) return;
    setSaving(true); setError("");
    try {
      const response = await base44.functions.invoke("serviceTrust", {
        action: "opening_condition_correction",
        request_id: request.id,
        conditions,
        photos,
      });
      onApplied(response.data.request);
    } catch (e) { setError(e?.message || "Não foi possível registrar o ajuste."); setSaving(false); }
  };
  return <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-4 space-y-3">
    <div className="flex gap-2 text-warning"><AlertTriangle className="w-5 h-5 shrink-0" /><div><p className="font-semibold text-sm">Informação diferente no local?</p><p className="text-xs mt-1">Marque o que encontrou. Para alterar o chamado, as fotos são obrigatórias.</p></div></div>
    {[{ id: "lock_problem", label: "Fechadura com problema" }, { id: "broken_key", label: "Chave quebrada dentro da fechadura" }].map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={conditions.includes(item.id)} onChange={() => toggle(item.id)} className="w-4 h-4 accent-primary" />{item.label}</label>)}
    <PhotoUploader label="Fotos obrigatórias da condição encontrada" photos={photos} onChange={setPhotos} />
    {error && <p className="text-xs text-destructive">{error}</p>}
    <Button onClick={apply} disabled={saving || !conditions.length || !photos.length} className="w-full">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Registrar condição e ajustar chamado</Button>
  </div>;
}