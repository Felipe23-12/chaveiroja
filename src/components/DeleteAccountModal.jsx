import React, { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

/**
 * Modal de confirmação para exclusão da conta do usuário.
 * Explica as consequências (apagamento dos dados) e, ao confirmar,
 * remove o registro do usuário e redireciona para o login.
 */
export default function DeleteAccountModal({ open, onOpenChange }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const user = await base44.auth.me();
      if (!user) throw new Error("Usuário não encontrado");
      await base44.entities.User.delete(user.id);
      await base44.auth.logout();
      window.location.href = "/login";
    } catch (e) {
      setError(e.message || "Não foi possível excluir a conta. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Excluir conta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Esta ação é <strong className="text-foreground">irreversível</strong>. Ao excluir sua conta:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 pl-1">
            <li className="flex gap-2"><span className="text-destructive">•</span> Seus dados de cadastro serão permanentemente apagados.</li>
            <li className="flex gap-2"><span className="text-destructive">•</span> Histórico de serviços e avaliações não poderão ser recuperados.</li>
            <li className="flex gap-2"><span className="text-destructive">•</span> Você será desconectado e redirecionado para o login.</li>
          </ul>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="min-h-[44px]"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            {deleting ? "Excluindo..." : "Excluir minha conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}