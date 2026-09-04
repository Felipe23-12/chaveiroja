import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoUploader from "@/components/locksmith/PhotoUploader";

/**
 * Perfil desativado automaticamente por 30 dias sem aceitar chamados.
 * O chaveiro reenvia os documentos para revalidar o cadastro e voltar a atender.
 */
export default function InactivityRevalidationCard({ locksmith, onRevalidated }) {
  const [docs, setDocs] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (docs.length < 1) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updated = await base44.entities.Locksmith.update(locksmith.id, {
        revalidation_documents: docs,
        revalidated_at: now,
        last_accepted_at: now,
        inactive_deactivated: false,
        available: true,
      });
      onRevalidated?.(updated);
    } finally {
      setSaving(false);
    }
  };

  const since = locksmith.deactivated_at
    ? new Date(locksmith.deactivated_at).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="p-4 rounded-2xl border-2 border-red-400 bg-red-50 space-y-3 mb-5">
      <div className="flex items-center gap-2 text-red-700">
        <ShieldAlert className="w-5 h-5" />
        <p className="font-bold text-sm">Perfil desativado por inatividade</p>
      </div>
      <p className="text-sm text-foreground">
        Você não aceitou nenhum chamado por mais de 30 dias{since ? ` (desativado em ${since})` : ""}.
        Envie novamente seus documentos (RG/CNH e comprovante de atividade) para revalidar o cadastro
        e voltar a receber solicitações.
      </p>
      <PhotoUploader label="Documentos para revalidação" photos={docs} onChange={setDocs} />
      <Button onClick={handleSubmit} disabled={saving || docs.length === 0} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
        Enviar documentos e reativar perfil
      </Button>
    </div>
  );
}