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
          to={"/cadastro/cliente" + qs}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-white hover:border-primary/40 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-foreground">Sou cliente</p>
            <p className="text-sm text-muted-foreground">Solicite serviços de chaveiro na hora</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          to={"/cadastro/chaveiro" + qs}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-white hover:border-primary/40 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-foreground">Sou chaveiro</p>
            <p className="text-sm text-muted-foreground">Receba solicitações e gerencie seus serviços</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>
    </AuthLayout>
  );
}