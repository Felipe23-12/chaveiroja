import React, { useState } from "react";
import { Mail, Loader2, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function GooglePasswordSetup({ email, accountType }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendLink = async () => {
    setSending(true);
    localStorage.setItem("google_password_setup", JSON.stringify({
      email,
      returnTo: `/google-complete?tipo=${accountType}`,
    }));
    try {
      await base44.auth.resetPasswordRequest(email);
    } finally {
      setSending(false);
      setSent(true);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h2 className="font-heading font-semibold text-foreground">Crie sua senha de acesso</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link seguro para {email}.</p>
      </div>
      {sent ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm text-foreground">Abra o e-mail, crie sua senha e você voltará para concluir o cadastro.</p>
      ) : (
        <Button type="button" className="w-full h-12" onClick={sendLink} disabled={sending || !email}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Enviar link para criar senha
        </Button>
      )}
    </div>
  );
}