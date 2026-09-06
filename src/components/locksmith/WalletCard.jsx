import React from "react";
import { Wallet, ArrowDownToLine, Clock } from "lucide-react";
import StripeWithdrawButton from "@/components/locksmith/StripeWithdrawButton";

export default function WalletCard({ balance, pending, onWithdraw }) {
  return (
    <div className="space-y-3">
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">Saldo disponível para saque</span>
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="font-heading font-bold text-3xl">
            R$ {(Number(balance) || 0).toFixed(2)}
          </p>
          <StripeWithdrawButton />
        </div>
        <div className="flex items-center gap-1.5 text-xs opacity-80">
          <Clock className="w-3.5 h-3.5" />
          <span>R$ {(Number(pending) || 0).toFixed(2)} em processamento</span>
        </div>
      </div>

      <button
        onClick={onWithdraw}
        disabled={!balance || balance <= 0}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-medium text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowDownToLine className="w-4 h-4" />
        Sacar via Pix
      </button>
    </div>
  );
}