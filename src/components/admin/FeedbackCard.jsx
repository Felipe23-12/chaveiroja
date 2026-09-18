import React from "react";

const categories = { suggestion: "Sugestão de melhoria", experience: "Minha experiência", bug: "Erro ou problema" };
export default function FeedbackCard({ feedback, author }) {
  return <article className="rounded-xl border border-border bg-card p-5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-foreground">{categories[feedback.category] || "Relato"}</span><time dateTime={feedback.created_date} className="text-xs text-muted-foreground">{new Date(feedback.created_date).toLocaleString("pt-BR")}</time></div>
    <h3 className="font-heading font-semibold break-words">{feedback.subject}</h3>
    <p className="text-xs text-muted-foreground break-words">{author ? `${author.full_name || "Usuário"} · ${author.email || ""}` : `Usuário: ${feedback.created_by_id || "não disponível"}`}</p>
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{feedback.message}</p>
  </article>;
}