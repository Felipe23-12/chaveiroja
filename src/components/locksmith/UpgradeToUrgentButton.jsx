import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Loader2 } from "lucide-react";
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
 * Permite ao cliente alterar um chamado já confirmado do modo normal para
 * URGENTE. Antes de aplicar, mostra a diferença de valor e pede confirmação.
 */
export default function UpgradeToUrgentButton({ request, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState(null);
  const { toast } = useToast();

  if (!request || request.urgency === "urgent") return null;
  if (["completed", "cancelled"].includes(request.status)) return null;

  if (request.urgency_upgrade_status === "pending") {
    return (
      <div className="p-3 rounded-xl border border-warning/40 bg-warning/10 text-warning text-sm font-medium text-center">
        Aguardando o chaveiro responder ao pedido de atendimento urgente (até 1 minuto)...
      </div>
    );
  }
  if (request.urgency_upgrade_status === "declined") {
    return (
      <div className="p-3 rounded-xl border border-border bg-muted/50 text-muted-foreground text-sm text-center">
        O chaveiro manteve este chamado no modo normal.
      </div>
    );
  }

  const current = request.price || 0;
  const newPrice = quote?.price ?? current;
  const diff = quote?.difference ?? 0;
  const prepareQuote = async () => {
    setQuoting(true);
    try {
      const response = await base44.functions.invoke('serviceTrust', { action: 'urgency_upgrade_quote', request_id: request.id });
      setQuote(response.data.pricing);
      setOpen(true);
    } catch (e) {
      toast({ title: 'Não foi possível calcular a urgência', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setQuoting(false); }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const response = await base44.functions.invoke("serviceTrust", {
        action: "request_urgency_upgrade",
        request_id: request.id,
        price: newPrice,
      });
      const updated = response.data.request;
      try {
        const user = await base44.auth.me();
        await base44.entities.ChatMessage.create({
          locksmith_id: request.locksmith_id,
          locksmith_name: request.locksmith_name,
          locksmith_user_id: request.locksmith_user_id,
          client_id: user?.id,
          client_name: user?.full_name || "Cliente",
          sender_type: "system",
          sender_name: "Chaveiro Já",
          message:
            "⚠️ O cliente solicitou mudar este chamado para URGENTE (chegada em até 35 minutos). Novo valor: R$ " +
            newPrice.toFixed(2) +
            ". O chaveiro tem 1 minuto para aceitar ou recusar — sem resposta, o pedido é aceito automaticamente.",
        });
      } catch (e) {
        /* não bloqueia a alteração */
      }
      onUpdated?.(updated);
      toast({
        title: "Pedido enviado ao chaveiro",
        description: `Ele tem 1 minuto para responder. Novo valor: R$ ${newPrice.toFixed(2)}`,
      });
      setOpen(false);
    } catch (e) {
      if (e?.response?.data?.pricing) setQuote(e.response.data.pricing);
      toast({
        title: "Falha ao alterar",
        description: e?.response?.data?.error || e.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={prepareQuote}
        disabled={quoting || saving}
        className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
      >
        {quoting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />} {quoting ? 'Consultando valor...' : 'Alterar para atendimento urgente'}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar para urgente?</AlertDialogTitle>
            <AlertDialogDescription>
              O atendimento urgente tem prioridade e prazo de chegada de até 35 minutos, mas o valor
              do serviço aumenta. Valor atual: R$ {current.toFixed(2)} · Novo valor: R${" "}
              {newPrice.toFixed(2)} (aumento de R$ {diff.toFixed(2)}). Você aceita?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Não, manter normal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Sim, aceito o novo valor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}