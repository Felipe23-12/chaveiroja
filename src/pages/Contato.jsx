import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TrustPageLayout from "@/components/trust/TrustPageLayout";

export default function Contato() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle");

  const submit = async (event) => {
    event.preventDefault();
    setStatus("sending");
    try {
      await base44.entities.ContactRequest.create(form);
      setForm({ name: "", email: "", message: "" });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <TrustPageLayout>
      <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Entre em contato</h1>
        <p className="mb-7 mt-3 text-muted-foreground">Envie sua dúvida, sugestão ou solicitação. Nossa equipe analisará a mensagem e responderá pelo e-mail informado.</p>
        {status === "sent" ? (
          <div className="rounded-xl bg-secondary p-5 text-secondary-foreground" role="status">Mensagem enviada com sucesso. Obrigado pelo contato.</div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div><Label htmlFor="contact-name">Nome</Label><Input id="contact-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2" /></div>
            <div><Label htmlFor="contact-email">E-mail</Label><Input id="contact-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2" /></div>
            <div><Label htmlFor="contact-message">Mensagem</Label><Textarea id="contact-message" required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-2" /></div>
            {status === "error" && <p className="text-sm text-destructive" role="alert">Não foi possível enviar. Tente novamente.</p>}
            <Button type="submit" className="w-full" disabled={status === "sending"}>{status === "sending" ? "Enviando..." : "Enviar mensagem"}</Button>
          </form>
        )}
      </section>
    </TrustPageLayout>
  );
}