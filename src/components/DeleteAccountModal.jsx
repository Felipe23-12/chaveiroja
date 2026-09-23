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
      await base44.functions.invoke('deleteOwnAccount', { action: 'confirm_delete' });
      // Logout already redirects. Do not make another request with the deleted identity.
      base44.auth.logout('/cadastro/chaveiro');
    } catch (e) {
      const status = e?.status || e?.response?.status;
      setError(status === 401 || /token.*expir|expir.*token|unauthorized/i.test(e?.message || '')
        ? 'Sua sessão expirou. Entre novamente na conta de cliente antes de confirmar a exclusão.'
        : e?.response?.data?.error || e.message || 'Não foi possível excluir a conta. Tente novamente.');
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
            <li className="flex gap-2"><span className="text-destructive">•</span> Você será desconectado e poderá iniciar o cadastro de chaveiro.</li>
          </ul>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <p>{error}</p>
              {error.includes('sessão expirou') && <button type="button" className="mt-2 font-semibold underline" onClick={() => base44.auth.logout('/login?tipo=cliente&returnTo=' + encodeURIComponent('/?abrir-exclusao=1'))}>Entrar novamente para excluir</button>}
            </div>
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