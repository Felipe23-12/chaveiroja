import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Trash2, Clock3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LegalSection from "@/components/legal/LegalSection";

const STEPS = [
  "Entre na sua conta no aplicativo Chaveiro Já.",
  "Abra o menu da conta e selecione “Excluir conta”.",
  "Leia o aviso e toque em “Excluir minha conta” para confirmar.",
];

export default function ExclusaoConta() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-4">
      <header className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center"><Trash2 className="w-5 h-5 text-primary-foreground" /></div>
          <div><h1 className="font-heading font-bold text-2xl">Exclusão da conta e dos dados</h1><p className="text-sm text-muted-foreground">Aplicativo Chaveiro Já</p></div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">Esta página explica como solicitar a exclusão permanente da sua conta e quais dados podem ser mantidos por obrigação legal.</p>
      </header>

      <LegalSection icon={ShieldCheck} title="Como solicitar a exclusão">
        <ol className="list-decimal pl-5 space-y-2">{STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>A exclusão da conta é iniciada imediatamente após a confirmação. Se você não conseguir entrar, use “Esqueci minha senha” na tela de login para recuperar o acesso e seguir as etapas.</p>
        <Button asChild className="w-full"><Link to="/login?returnTo=/"><span>Acessar o Chaveiro Já</span><ArrowRight className="w-4 h-4" /></Link></Button>
      </LegalSection>

      <LegalSection icon={Trash2} title="Dados excluídos ou anonimizados">
        <p>São excluídos os dados de acesso e cadastro, como nome, e-mail, telefone, CPF e foto de perfil, além da localização em tempo real e das informações opcionais do perfil. Mensagens, fotos, avaliações e demais conteúdos vinculados à conta são excluídos ou anonimizados quando não houver obrigação legal de conservação.</p>
      </LegalSection>

      <LegalSection icon={Clock3} title="Dados mantidos e prazo de retenção">
        <p>Registros mínimos de atendimentos, pagamentos, recibos e documentos fiscais poderão ser mantidos por até 5 anos para cumprimento de obrigações legais, fiscais, prevenção a fraudes e exercício regular de direitos. Durante esse período, o acesso é restrito; ao final, os dados são eliminados ou anonimizados.</p>
        <p>A exclusão da conta é irreversível e os dados removidos não poderão ser recuperados.</p>
      </LegalSection>
    </main>
  );
}