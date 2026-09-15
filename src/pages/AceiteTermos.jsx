import React, { useState } from "react";
import { safeReturnTo } from "@/lib/authReturnTo";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import TermsAcceptance from "@/components/auth/TermsAcceptance";
import { termsPayload } from "@/lib/termsVersion";

export default function AceiteTermos() {
  const { user, checkUserAuth, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accountType = user?.account_type === "chaveiro" ? "chaveiro" : "cliente";
  const safePath = safeReturnTo();
  const returnTo = safePath.startsWith("/aceite-termos") ? "/" : safePath;

  const handleAccept = async () => {
    if (!accepted) return;
    setSaving(true);
    setError("");
    try {
      await base44.auth.updateMe(termsPayload());
      await checkUserAuth();
      window.location.assign(returnTo);
    } catch (e) {
      setError(String(e?.message || "Não foi possível registrar o aceite. Tente novamente."));
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Regras e termos do aplicativo"
      subtitle="Para continuar, confirme que leu e aceita as regras vigentes"
    >
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o Código de Defesa do
        Consumidor (Lei nº 8.078/1990) e o Marco Civil da Internet (Lei nº 12.965/2014), pedimos a confirmação
        do aceite uma única vez, no cadastro, antes do uso das funções do aplicativo.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <TermsAcceptance accountType={accountType} checked={accepted} onChange={setAccepted} />

      <Button onClick={handleAccept} className="w-full h-12 font-medium mt-4" disabled={!accepted || saving}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando aceite...
          </>
        ) : (
          "Aceitar e continuar"
        )}
      </Button>

      <Button variant="ghost" className="w-full mt-2 text-muted-foreground" onClick={() => logout()}>
        Não aceito — sair da conta
      </Button>
    </AuthLayout>
  );
}