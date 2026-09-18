import React, { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Correção do C3 (auditoria de segurança, 18/09/2026): move Pix, banco, saldo
 * e documentos de revalidação de chaveiros já cadastrados antes da correção
 * para o registro financeiro trancado (LocksmithFinancials), e limpa esses
 * campos do Locksmith — que qualquer usuário logado conseguia ler. Rodar
 * uma vez só, depois que esta correção for publicada.
 */
export default function MigrateLocksmithFinancialsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  const runPreview = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("migrateLocksmithFinancials", { dry_run: true });
      setPreview(data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível consultar a migração.");
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("migrateLocksmithFinancials", { dry_run: false });
      setDone(data);
      setPreview(null);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível concluir a migração.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setPreview(null); setDone(null); setError(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShieldCheck className="w-4 h-4" /> Migrar dados financeiros (correção C3)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migrar dados financeiros dos chaveiros</DialogTitle>
          <DialogDescription>
            Move Pix, banco, saldo e documentos de revalidação de chaveiros já cadastrados para o
            registro financeiro trancado, e limpa esses campos do perfil público. Rode a prévia
            primeiro para conferir o que seria alterado.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!preview && !done && (
          <Button onClick={runPreview} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Ver prévia
          </Button>
        )}

        {preview && !done && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {preview.migrated} de {preview.checked} chaveiro(s) têm dados a migrar.
            </p>
            {preview.migrated > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
                {preview.details.map((d) => (
                  <div key={d.id} className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{d.name || d.id}</strong> — saldo {money(d.legacy_wallet_balance)}
                    {d.legacy_pending_balance > 0 && ` · pendente ${money(d.legacy_pending_balance)}`}
                    {d.had_pix && " · Pix"}
                    {d.had_bank && " · banco"}
                    {d.documents_count > 0 && ` · ${d.documents_count} documento(s)`}
                  </div>
                ))}
              </div>
            )}
            <Button onClick={runMigration} disabled={loading || preview.migrated === 0} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Confirmar e migrar {preview.migrated} chaveiro(s)
            </Button>
          </div>
        )}

        {done && (
          <p className="text-sm text-success">
            Migração concluída: {done.migrated} chaveiro(s) atualizados.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
