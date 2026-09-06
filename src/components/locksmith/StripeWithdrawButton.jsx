import React, { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/** Botão de saque que leva o chaveiro direto ao painel da conta Stripe dele. */
export default function StripeWithdrawButton({ className = "" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const open = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("stripeConnect", { action: "create_login_link" });
      if (!res.data?.url) throw new Error("Conclua o cadastro Stripe para sacar.");
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Não foi possível abrir sua conta Stripe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={open}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
        Sacar no Stripe
      </button>
      {error && <p className="mt-1 text-[11px] text-white/90">{error}</p>}
    </div>
  );
}