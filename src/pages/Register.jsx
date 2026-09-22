import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, User, Wrench, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const returnTo = safeReturnTo();
  const qs = returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "";

  return (
    <AuthLayout
      icon={UserPlus}
      title="Criar sua conta"
      subtitle="Escolha o tipo de conta para começar"
      footer={
        <>
          Já tem conta?{" "}
          <Link to={"/login" + qs} className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <Link
          to={"/login?tipo=cliente&returnTo=" + encodeURIComponent(returnTo)}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-foreground">Sou cliente</p>
            <p className="text-sm text-muted-foreground">Solicite serviços de chaveiro na hora</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          to={'/login?tipo=chaveiro&returnTo=' + encodeURIComponent('/painel-chaveiro')}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Wrench className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-heading font-semibold text-foreground">Sou chaveiro</p>
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Profissional</span>
            </div>
            <p className="text-sm text-muted-foreground">Receba solicitações e gerencie seus serviços</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <p className="text-xs text-center text-muted-foreground pt-3">O mesmo CPF não pode ser usado em contas de cliente e chaveiro ao mesmo tempo. Para mudar de tipo, entre na conta atual e exclua-a antes de criar a nova.</p>
        <p className="text-xs text-center text-muted-foreground pt-3">
          Ao continuar, você declara estar ciente da{" "}
          <Link to="/politica-reembolso" className="text-primary hover:underline font-medium">
            Política de Reembolso e Garantia de Serviço
          </Link>.
        </p>
      </div>
    </AuthLayout>
  );
}