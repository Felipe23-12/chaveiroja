import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PhotoUploader from "@/components/locksmith/PhotoUploader";

const CATEGORIES = [
  ["pornography", "Pornografia ou conteúdo sexual"], ["violence", "Violência ou ameaça"],
  ["harassment", "Assédio ou intimidação"], ["discrimination", "Discriminação"],
  ["illegal_activity", "Atividade ilegal"], ["human_dignity", "Ofensa à dignidade humana"], ["other", "Outra conduta"],
];

export default function ReportForm({ data, onDone }) {
  const [category, setCategory] = useState("violence");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await base44.functions.invoke("reportChannel", {
        action: "createReport",
        data: { ...data, category, description: description.trim(), photos },
      });
      onDone(response.data.report);
    } catch (e) {
      setError(e?.message || "Não foi possível enviar a denúncia.");
      setSaving(false);
    }
  };
  return <form onSubmit={submit} className="space-y-4">
    {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva detalhadamente o que aconteceu" rows={4} required />
    <PhotoUploader photos={photos} onChange={setPhotos} label="Evidências em fotos (opcional)" />
    <Button type="submit" className="w-full" disabled={saving || !description.trim()}>{saving ? "Enviando..." : "Enviar para análise"}</Button>
  </form>;
}