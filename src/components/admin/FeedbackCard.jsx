import React from "react";
import { Image } from "@/components/ui/image";

const categories = { suggestion: "Sugestão de melhoria", experience: "Minha experiência", bug: "Erro ou problema" };
export default function FeedbackCard({ feedback, author }) {
  return <article className="rounded-xl border border-border bg-card p-5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-foreground">{categories[feedback.category] || "Relato"}</span><time dateTime={feedback.created_date} className="text-xs text-muted-foreground">{new Date(feedback.created_date).toLocaleString("pt-BR")}</time></div>
    <h3 className="font-heading font-semibold break-words">{feedback.subject}</h3>
    <p className="text-xs text-muted-foreground break-words">{feedback.reporter_name || author?.full_name || "Usuário"} · {feedback.reporter_email || author?.email || ""}</p>
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{feedback.message}</p>
    {!!feedback.photo_urls?.length && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{feedback.photo_urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border" aria-label={`Abrir foto ${index + 1}`}><Image src={url} alt={`Foto do erro ${index + 1}`} className="aspect-square w-full" /></a>)}</div>}
  </article>;
}