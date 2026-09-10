import React from "react";
import { Wallet, ArrowDownToLine, Clock } from "lucide-react";
import StripeBalanceCard from "@/components/locksmith/StripeBalanceCard";

export default function WalletCard({ balance, pending, onWithdraw, platformManaged = false }) {
  return (
    <div className="space-y-3">
      {!platformManaged && <StripeBalanceCard />}
      {(platformManaged || Number(balance) > 0 || Number(pending) > 0) && <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">Saldo interno — ainda não repassado ao Stripe</span>
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-heading font-bold text-3xl">
            R$ {(Number(balance) || 0).toFixed(2)}
          </p>

        </div>
        <div className="flex items-center gap-1.5 text-xs opacity-80">
          <Clock className="w-3.5 h-3.5" />
          <span>R$ {(Number(pending) || 0).toFixed(2)} em saque solicitado</span>
        </div>
        <p className="text-xs mt-2 opacity-90">Este valor está registrado no aplicativo, mas não compõe o saldo da conta Stripe.</p>
      </div>}

      {onWithdraw && <button
        onClick={onWithdraw}
        disabled={!balance || balance <= 0}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-medium text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowDownToLine className="w-4 h-4" />
        Solicitar saldo interno via Pix
      </button>}
    </div>
  );
}