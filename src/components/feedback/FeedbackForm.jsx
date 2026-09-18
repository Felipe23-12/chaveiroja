import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FeedbackPhotoUploader from "@/components/feedback/FeedbackPhotoUploader";

const hasLink = (text) => /(https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|io|app|dev|br)(?:[/?#\s]|$))/i.test(text);

export default function FeedbackForm() {
  const [category, setCategory] = useState("suggestion");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const submit = async (event) => {
    event.preventDefault();
    if (saving || !subject.trim() || !message.trim()) return;
    if (hasLink(subject) || hasLink(message)) { setError("Links não são permitidos nos relatos."); return; }
    setSaving(true); setError("");
    try {
      await base44.functions.invoke("feedbackOperations", { action: "submit", category, subject: subject.trim(), message: message.trim(), photo_uris: photos.map((photo) => photo.uri) });
      queryClient.invalidateQueries({ queryKey: ["app-feedback"] });
      setSent(true); setSubject(""); setMessage(""); setPhotos([]);
    } catch (err) {
      setError(err?.response?.data?.error || "Não foi possível enviar seu relato. Tente novamente.");
    } finally { setSaving(false); }
  };
  if (sent) return <div className="rounded-2xl border border-success/30 bg-success/10 p-6 space-y-3" role="status">
    <CheckCircle2 className="h-7 w-7 text-success" /><h2 className="font-heading font-semibold">Relato enviado!</h2>
    <p className="text-sm text-muted-foreground">Obrigado por ajudar a melhorar o aplicativo. Seu relato está disponível para a equipe administrativa.</p>
    <Button variant="outline" className="min-h-[44px]" onClick={() => setSent(false)}>Enviar outro relato</Button>
  </div>;
  return <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-5">
    <fieldset disabled={saving} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="feedback-category">Tipo de relato</Label><select id="feedback-category" value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="suggestion">Sugestão de melhoria</option><option value="experience">Minha experiência</option><option value="bug">Erro ou problema</option></select></div>
      <div className="space-y-2"><Label htmlFor="feedback-subject">Assunto</Label><Input id="feedback-subject" required maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Resuma o que você gostaria de nos contar" className="min-h-[44px]" /></div>
      <div className="space-y-2"><Label htmlFor="feedback-message">Conte mais</Label><Textarea id="feedback-message" required maxLength={3000} rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva sua experiência ou sugestão. Se ocorreu um erro, diga em qual tela e o que você estava tentando fazer." aria-describedby="feedback-hint" /><p id="feedback-hint" className="text-xs text-muted-foreground">Não inclua links, senhas, CPF ou dados de pagamento. {message.length}/3000 caracteres.</p></div>
      <FeedbackPhotoUploader photos={photos} onChange={setPhotos} onError={setError} />
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={saving || !subject.trim() || !message.trim()} className="w-full min-h-[44px]">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{saving ? "Enviando..." : "Enviar relato"}</Button>
  </form>;
}