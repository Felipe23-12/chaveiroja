import React, { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ClientReviewForm({ request, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (!rating || saving) return;
    setSaving(true); setError("");
    try {
      const response = await base44.functions.invoke("serviceTrust", { action: "submit_client_review", request_id: request.id, rating, comment });
      onSubmitted?.(response.data.review);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Não foi possível enviar.");
    } finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="mt-3 space-y-3 border-t border-border pt-3">
    <p className="text-sm font-semibold">Avaliar cliente</p>
    <div className="flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className="min-h-[44px] min-w-[44px]" aria-label={`${value} estrelas`}><Star className={`mx-auto h-6 w-6 ${value <= rating ? "fill-warning text-warning" : "text-border"}`} /></button>)}</div>
    <Textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={3000} rows={2} placeholder="Como foi a experiência com este cliente? (opcional)" />
    {error && <p className="text-xs text-destructive">{error}</p>}
    <Button type="submit" disabled={!rating || saving}>{saving && <Loader2 className="animate-spin" />}Enviar avaliação</Button>
  </form>;
}