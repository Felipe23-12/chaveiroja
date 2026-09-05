import React from "react";
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

/** Confirmação nativa da taxa de cancelamento (window.confirm não funciona em WebView) */
export default function CancelFeeConfirmDialog({ open, onOpenChange, cancelFeeData, onBack }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar taxa de cancelamento</AlertDialogTitle>
          <AlertDialogDescription>
            O chaveiro já aceitou seu pedido e está a caminho. Será cobrada uma taxa de cancelamento{" "}
            {cancelFeeData?.fixed ? "fixa" : "de 25%"} de R$ {cancelFeeData?.fee.toFixed(2)}, paga apenas online (cartão). Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onBack}>Não, voltar</AlertDialogCancel>
          <AlertDialogAction>Sim, pagar taxa e cancelar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}