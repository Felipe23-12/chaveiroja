import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { URGENCY_MULTIPLIER } from "@/lib/dynamicPricing";
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
  const { toast } = useToast();

  if (!request || request.urgency === "urgent") return null;
  if (["completed", "cancelled"].includes(request.status)) return null;

  const current = request.price || 0;
  const newPrice = Math.round(current * URGENCY_MULTIPLIER * 100) / 100;
  const diff = Math.round((newPrice - current) * 100) / 100;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.ServiceRequest.update(request.id, {
        urgency: "urgent",
        price: newPrice,
      });
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
            "⚠️ O cliente alterou este chamado para URGENTE: o chaveiro tem até 35 minutos para chegar ao local. Novo valor: R$ " +
            newPrice.toFixed(2),
        });
      } catch (e) {
        /* não bloqueia a alteração */
      }
      onUpdated?.(updated);
      toast({
        title: "Chamado alterado para urgente",
        description: `Novo valor: R$ ${newPrice.toFixed(2)}`,
      });
      setOpen(false);
    } catch (e) {
      toast({
        title: "Falha ao alterar",
        description: e.message || "Tente novamente",
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
        onClick={() => setOpen(true)}
        className="w-full text-red-600 border-red-300 hover:bg-red-50"
      >
        <Zap className="w-4 h-4 mr-2" /> Alterar para atendimento urgente
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