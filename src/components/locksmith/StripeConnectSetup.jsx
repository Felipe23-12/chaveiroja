import React, { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import useOnAppResume from "@/hooks/useOnAppResume";

export default function StripeConnectSetup({ onStatusChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("stripeConnect", { action: "get_status" });
      setStatus(res.data);
      onStatusChange?.(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível consultar o Stripe.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onStatusChange]);

  // Revalida o cadastro sempre que o chaveiro volta ao aplicativo
  useOnAppResume(loadStatus);

  useEffect(() => {
    loadStatus();
    // Ao voltar do Stripe, a liberação das capacidades pode levar alguns segundos:
    // reconsultamos algumas vezes para vincular a conta automaticamente.
    const returning = new URLSearchParams(window.location.search).get("stripe");
    if (!returning) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      loadStatus();
      if (tries >= 4) clearInterval(timer);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!status?.under_review) return;
    const timer = setInterval(() => loadStatus(true), 30000);
    return () => clearInterval(timer);
  }, [status?.under_review, loadStatus]);

  const setup = async () => {
    setWorking(true);
    setError("");
    try {
      let account = status;
      if (!account?.account_id) {
        const created = await base44.functions.invoke("stripeConnect", { action: "create_account" });
        account = created.data;
      }
      const link = await base44.functions.invoke("stripeConnect", { action: "create_onboarding_link" });
      if (!link.data?.url) throw new Error("O Stripe não retornou o link de cadastro.");
      window.location.href = link.data.url;
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível iniciar o cadastro no Stripe.");
      setWorking(false);
    }
  };

  const refresh = async () => {
    setWorking(true);
    await loadStatus();
    setWorking(false);
  };

  const requestPix = async () => {
    setWorking(true);
    setError("");
    try {
      const res = await base44.functions.invoke("stripeConnect", { action: "request_pix" });
      if (res.data?.error) setError(res.data.error);
      await loadStatus();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível solicitar o Pix.");
    } finally {
      setWorking(false);
    }
  };

  const openDashboard = async () => {
    setWorking(true);
    setError("");
    try {
      const res = await base44.functions.invoke("stripeConnect", { action: "create_login_link" });
      if (!res.data?.url) throw new Error("Link do painel Stripe não disponível.");
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível abrir o painel Stripe.");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Verificando recebimentos...</div>;
  }

  const active = status?.charges_enabled && status?.payouts_enabled;
  const underReview = status?.under_review;
  const pixActive = status?.pix_payments_status === "active";

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Recebimentos pelo Chaveiro Já</p>
          <p className="text-sm text-muted-foreground mt-0.5">Configure sua conta Stripe para receber automaticamente os pagamentos dos clientes.</p>
        </div>
      </div>

      {active ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4" /> Conta Stripe ativa para receber pagamentos e repasses.
        </div>
      ) : underReview ? (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
          <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" />
          <span><strong>Conta em análise pelo Stripe.</strong> Você pode usar o aplicativo normalmente. Os recebimentos serão liberados automaticamente após a aprovação.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4" /> Cadastro Stripe ainda precisa ser concluído.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Pagamentos</span><br /><strong>{status?.charges_enabled ? "Ativo" : "Pendente"}</strong></div>
        <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Repasses</span><br /><strong>{status?.payouts_enabled ? "Ativo" : "Pendente"}</strong></div>
        <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Pix</span><br /><strong>{pixActive ? "Ativo" : status?.pix_payments_status === "pending" ? "Em análise" : "Não ativo"}</strong></div>
        <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Cadastro</span><br /><strong>{status?.details_submitted ? "Enviado" : "Não concluído"}</strong></div>
      </div>

      {status?.requirements?.currently_due?.length > 0 && (
        <p className="text-xs text-muted-foreground">O Stripe ainda solicita algumas informações para liberar completamente a conta.</p>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!active && !underReview && <Button onClick={setup} disabled={working} size="sm">
          {working ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-1.5" />}
          {status?.account_id ? "Continuar cadastro Stripe" : "Configurar recebimentos"}
        </Button>}
        {status?.account_id && <Button onClick={refresh} disabled={working} variant="outline" size="sm">Atualizar status</Button>}
        {status?.account_id && active && <Button onClick={openDashboard} disabled={working} variant="outline" size="sm">Abrir painel Stripe</Button>}
        {status?.account_id && !pixActive && <Button onClick={requestPix} disabled={working} variant="outline" size="sm">Solicitar Pix</Button>}
      </div>
    </div>
  );
}