import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateCancellationFee } from "@/lib/pricing";
import { getCancellationWindow } from "@/lib/cancellationWindow";
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

  if (!request || request.status === "completed" || request.status === "cancelled") return null;

  const free = getCancellationWindow(request).free;
  const feeData = free
    ? null
    : calculateCancellationFee(request.price, {
        serviceType: request.service_type,
        urgency: request.urgency,
      });

  const handleConfirm = async () => {
    if (loading) return;
    if (!free) {
      // A taxa é paga online no fluxo da tela inicial
      navigate("/?cancel=1");
      return;
    }
    setLoading(true);
    try {
      await base44.entities.ServiceRequest.update(request.id, {
        status: "cancelled",
        cancelled_by: "cliente",
      });
      toast({ title: "Serviço cancelado", description: "Sua solicitação foi cancelada sem custo." });
      navigate("/");
    } catch (e) {
      toast({ title: "Falha ao cancelar", description: e.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
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
                ? "O cancelamento agora é sem custo. Deseja continuar?"
                : `Será cobrada uma taxa de cancelamento ${feeData?.fixed ? "fixa" : "de 25%"} de R$ ${feeData?.fee.toFixed(2)}, paga apenas online (cartão).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {free ? "Sim, cancelar" : "Continuar para a taxa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}