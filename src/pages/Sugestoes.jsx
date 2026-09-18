import React from "react";
import { MessageSquare } from "lucide-react";
import FeedbackForm from "@/components/feedback/FeedbackForm";

export default function Sugestoes() {
  return <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
    <header className="space-y-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary p-3 text-primary-foreground"><MessageSquare className="h-5 w-5" /></div><h1 className="font-heading text-2xl font-bold">Sugestões e problemas</h1></div><p className="text-sm text-muted-foreground">Compartilhe sua experiência, sugira melhorias ou relate erros que encontrou no aplicativo. Seu relato não será público.</p></header>
    <FeedbackForm />
  </div>;
}