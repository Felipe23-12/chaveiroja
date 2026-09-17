import React, { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/** Disparo manual: avisa chaveiros sem conta Mercado Pago conectada que precisam conectar para aceitar chamados. */
export default function NotifyMissingMercadoPagoButton() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleClick = async () => {
    setSending(true);
    try {
      const { data } = await base44.functions.invoke("notifyMissingMercadoPagoAccounts", {});
      toast({
        title: "Notificações enviadas",
        description: `${data.sent} de ${data.eligible} chaveiro(s) sem conta Mercado Pago foram notificados.${data.failed ? ` ${data.failed} falharam.` : ""}`,
      });
    } catch (e) {
      toast({
        title: "Erro ao enviar notificações",
        description: e?.response?.data?.error || e?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={sending} className="gap-2">
      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
      Enviar notificação para chaveiros que não cadastraram a conta no Mercado Pago
    </Button>
  );
}
