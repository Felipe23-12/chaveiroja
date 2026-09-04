import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GMAIL_CONNECTOR_ID } from "@/lib/gmailStatusEmail";

export default function GmailConnectCard() {
  const [authed, setAuthed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConnection = async () => {
    try {
      await base44.functions.invoke("sendStatusEmailViaGmail", { status: "ping" });
      setConnected(true);
    } catch (e) {
      // 400 = conectado (payload inválido); outros erros = sem conexão
      setConnected(e?.response?.status === 400);
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (ok) => {
      setAuthed(ok);
      if (ok) await checkConnection();
      setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(GMAIL_CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        checkConnection();
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(GMAIL_CONNECTOR_ID);
    setConnected(false);
  };

  if (loading) return null;
  if (!authed) {
    return (
      <Button variant="outline" onClick={() => base44.auth.redirectToLogin()} className="w-full">
        Entrar para conectar o Gmail
      </Button>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <Mail className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">Avisos automáticos por Gmail</p>
        <p className="text-xs text-muted-foreground">
          {connected
            ? "Conectado — o cliente recebe e-mail quando o serviço entra em rota ou é cancelado."
            : "Conecte sua conta Gmail para avisar o cliente automaticamente."}
        </p>
      </div>
      {connected ? (
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> Desconectar
        </Button>
      ) : (
        <Button size="sm" onClick={handleConnect}>Conectar</Button>
      )}
    </div>
  );
}