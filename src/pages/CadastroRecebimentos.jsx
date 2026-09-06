import React from "react";
import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/AuthLayout";
import StripeConnectSetup from "@/components/locksmith/StripeConnectSetup";

/** Etapa final do cadastro do chaveiro: configurar a conta Stripe para receber valores. */
export default function CadastroRecebimentos() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      icon={Wallet}
      title="Receber seus pagamentos"
      subtitle="Cadastre sua conta no Stripe para receber os valores dos atendimentos"
    >
      <StripeConnectSetup />

      <Button
        variant="ghost"
        className="w-full mt-4 text-muted-foreground"
        onClick={() => navigate("/painel-chaveiro")}
      >
        Fazer isso depois
      </Button>
    </AuthLayout>
  );
}