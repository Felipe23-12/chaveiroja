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
  const [policy, setPolicy] = useState(null);

  const handleStatus = useCallback((status) => {
    setActive(!!(status?.charges_enabled && status?.payouts_enabled));
    setUnderReview(!!status?.under_review);
    setPolicy({ required: !!status?.onboarding_required, completed: !!(status?.onboarding_completed || status?.details_submitted || status?.under_review) });
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
            : policy?.required ? "Etapa final do seu cadastro: vincule os recebimentos para concluir sua entrada no aplicativo" : "Cadastre sua conta no Stripe para receber os valores dos atendimentos"
      }
    >
      {active ? (
        <StripeSetupSuccess onContinue={() => navigate("/painel-chaveiro")} />
      ) : (
        <>
          {policy?.required && !policy.completed && <p className="mb-4 text-sm text-muted-foreground">Ao continuar, seu nome, email, telefone e CPF disponíveis serão enviados ao Stripe para preencher o cadastro. Você poderá revisar os dados e informar os documentos e dados bancários solicitados; a aprovação é feita pelo Stripe.</p>}
          <StripeConnectSetup onStatusChange={handleStatus} />

          {policy && (!policy.required || policy.completed) && <Button
            variant="ghost"
            className="w-full mt-4 text-muted-foreground"
            onClick={() => navigate("/painel-chaveiro")}
          >
            {policy.completed ? "Continuar para o aplicativo" : "Fazer isso depois"}
          </Button>}
        </>
      )}
    </AuthLayout>
  );
}