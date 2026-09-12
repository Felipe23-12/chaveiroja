import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/**
 * Botão de cancelamento do cliente na tela de acompanhamento.
 * Mantém as regras existentes: grátis dentro da janela de carência,
 * caso contrário o pagamento da taxa é feito no fluxo da tela inicial.
 */
export default function CancelServiceButton({ request }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  if (!request || request.status === "completed" || request.status === "cancelled") return null;

  const free = quote?.free === true;
  const feeData = quote;
  const openConfirmation = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("serviceTrust", { action: "cancel_quote", request_id: request.id });
      setQuote(data);
      setOpen(true);
    } catch (e) {
      toast({ title: "Não foi possível consultar o cancelamento", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data: result } = await base44.functions.invoke("serviceTrust", {
        action: "cancel_request",
        request_id: request.id,
        actor: "cliente",
        confirmed_fee: !free,
      });
      toast({
        title: "Serviço cancelado",
        description: !result.request.cancellation_fee ? "Sua solicitação foi cancelada sem custo." : "O chamado foi cancelado e a taxa ficou disponível para pagamento.",
      });
      navigate("/");
    } catch (e) {
      if (e?.response?.data?.requires_fee) { setQuote(e.response.data); setOpen(true); return; }
      toast({ title: "Falha ao cancelar", description: e?.response?.data?.error || e.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={openConfirmation}
        disabled={loading}
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
      >
        <XCircle className="w-4 h-4 mr-2" /> Cancelar serviço
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              {free
                ? "O cancelamento agora é sem custo. Os três primeiros cancelamentos do dia são gratuitos. Deseja continuar?"
                : `Será cobrada uma taxa de cancelamento ${feeData?.fixed ? "fixa" : "de 25%"} de R$ ${feeData?.fee.toFixed(2)}, paga apenas online (cartão).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, voltar</AlertDialogCancel>
            <AlertDialogAction disabled={loading || !quote} onClick={handleConfirm}>
              {free ? "Sim, cancelar" : "Continuar para a taxa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}