import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/AuthLayout";
import MercadoPagoConnectSetup from "@/components/locksmith/MercadoPagoConnectSetup";
import MercadoPagoSetupSuccess from "@/components/locksmith/MercadoPagoSetupSuccess";

/** Etapa final do cadastro do chaveiro: vincular o Mercado Pago para receber valores. */
export default function CadastroRecebimentos() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [policy, setPolicy] = useState(null);

  const handleStatus = useCallback((status) => {
    setActive(!!status?.connected);
    setPolicy({ required: !!status?.onboarding_required, completed: !!status?.onboarding_completed });
  }, []);

  return (
    <AuthLayout
      icon={Wallet}
      title={active ? "Recebimentos configurados" : "Receber seus pagamentos"}
      subtitle={active ? "Sua conta Mercado Pago já está vinculada ao ChaveiroJá" : policy?.required ? "Etapa final do seu cadastro: vincule os recebimentos para concluir sua entrada no aplicativo" : "Você pode conectar agora ou continuar e acumular créditos pendentes na plataforma"}
    >
      {active ? (
        <MercadoPagoSetupSuccess onContinue={() => navigate("/painel-chaveiro")} />
      ) : (
        <>
          {policy?.required && !policy.completed && <p className="mb-4 text-sm text-muted-foreground">Entre na sua conta Mercado Pago e autorize o ChaveiroJá a processar os atendimentos e repassar sua parte automaticamente.</p>}
          <MercadoPagoConnectSetup onStatusChange={handleStatus} />

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