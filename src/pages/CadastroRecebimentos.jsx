import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/AuthLayout";
import StripeConnectSetup from "@/components/locksmith/StripeConnectSetup";
import StripeSetupSuccess from "@/components/locksmith/StripeSetupSuccess";

/** Etapa final do cadastro do chaveiro: configurar a conta Stripe para receber valores. */
export default function CadastroRecebimentos() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [underReview, setUnderReview] = useState(false);

  const handleStatus = useCallback((status) => {
    setActive(!!(status?.charges_enabled && status?.payouts_enabled));
    setUnderReview(!!status?.under_review);
  }, []);

  return (
    <AuthLayout
      icon={Wallet}
      title={active ? "Recebimentos configurados" : underReview ? "Conta em análise" : "Receber seus pagamentos"}
      subtitle={
        active
          ? "Sua conta Stripe já está vinculada ao ChaveiroJá"
          : underReview
            ? "O Stripe está analisando seus dados; o restante do aplicativo continua liberado"
            : "Cadastre sua conta no Stripe para receber os valores dos atendimentos"
      }
    >
      {active ? (
        <StripeSetupSuccess onContinue={() => navigate("/painel-chaveiro")} />
      ) : (
        <>
          <StripeConnectSetup onStatusChange={handleStatus} />

          <Button
            variant="ghost"
            className="w-full mt-4 text-muted-foreground"
            onClick={() => navigate("/painel-chaveiro")}
          >
            Fazer isso depois
          </Button>
        </>
      )}
    </AuthLayout>
  );
}