import React, { useEffect, useState } from "react";
import { ArrowUpRight, Loader2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Botão de saque. Se o chaveiro já tem conta Stripe ativa, abre o painel dele.
 * Se ainda não tem, cria a conta e direciona ao cadastro no site do Stripe.
 */
export default function StripeWithdrawButton({ className = "" }) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(null); // null = verificando
  const [error, setError] = useState("");

  useEffect(() => {
    base44.functions
      .invoke("stripeConnect", { action: "get_status" })
      .then((res) => setReady(Boolean(res.data?.account_id && res.data?.payouts_enabled)))
      .catch(() => setReady(false));
  }, []);

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      if (ready) {
        const res = await base44.functions.invoke("stripeConnect", { action: "create_login_link" });
        if (!res.data?.url) throw new Error("Painel Stripe indisponível.");
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        const status = await base44.functions.invoke("stripeConnect", { action: "get_status" });
        if (!status.data?.account_id) {
          await base44.functions.invoke("stripeConnect", { action: "create_account" });
        }
        const link = await base44.functions.invoke("stripeConnect", { action: "create_onboarding_link" });
        if (!link.data?.url) throw new Error("O Stripe não retornou o link de cadastro.");
        window.location.href = link.data.url;
        return;
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível continuar no Stripe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading || ready === null}
        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {loading || ready === null ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : ready ? (
          <ArrowUpRight className="w-4 h-4" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
        {ready ? "Sacar no Stripe" : "Cadastrar no Stripe"}
      </button>
      {error && <p className="mt-1 text-[11px] text-white/90">{error}</p>}
    </div>
  );
}