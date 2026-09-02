import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function GoogleComplete() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  const tipo = searchParams.get("tipo");

  useEffect(() => {
    const complete = async () => {
      const accountType = tipo === "chaveiro" ? "chaveiro" : "cliente";
      const dest = accountType === "chaveiro" ? "/painel-chaveiro" : "/";

      try {
        await base44.auth.updateMe({ account_type: accountType });
      } catch (e) {
        // Mesmo que falhe ao salvar, redireciona para o painel correto
        console.error("Erro ao definir account_type:", e);
      }

      window.location.assign(dest);
    };

    complete();
  }, [tipo]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Finalizando seu cadastro...</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}