import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import useOnAppResume from "@/hooks/useOnAppResume";
import prepareLocksmithProfile from '@/lib/locksmithOnboarding';

export default function MercadoPagoConnectSetup({ onStatusChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const loadStatus = useCallback(async () => {
    setError("");
    try {
      const { data } = await base44.functions.invoke("mercadoPagoConnect", { action: "get_status" });
      setStatus(data);
      onStatusChange?.(data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível consultar o Mercado Pago.");
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);
  useOnAppResume(loadStatus);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  const connect = async () => {
    setWorking(true);
    setError("");
    try {
      await prepareLocksmithProfile();
      const { data } = await base44.functions.invoke("mercadoPagoConnect", { action: "connect" });
      if (!data?.url) throw new Error("Link de conexão indisponível.");

      window.location.assign(data.url);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível conectar o Mercado Pago.");
      setWorking(false);
    }
  };
  if (loading) return <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Verificando recebimentos...</div>;
  return <div className="p-4 rounded-xl border border-border bg-card space-y-4">
    <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-primary" /></div><div><p className="font-semibold">Recebimentos pelo Mercado Pago</p><p className="text-sm text-muted-foreground mt-0.5">Com a conta vinculada, novas cobranças usam o repasse do Mercado Pago. Créditos anteriores continuam pendentes na plataforma.</p></div></div>
    {status?.connected ? <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg p-3"><CheckCircle2 className="w-4 h-4" /> Conta Mercado Pago vinculada e pronta para receber.</div> : <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 rounded-lg p-3"><AlertTriangle className="w-4 h-4" /> Sem conexão, você não pode aceitar chamados do Modo Aplicativo. Conecte para começar a receber.</div>}
    {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
    {!status?.connected && <Button onClick={connect} disabled={working} size="sm">{working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Conectar Mercado Pago</Button>}
  </div>;
}