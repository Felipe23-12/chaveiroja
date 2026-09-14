import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, TrendingUp, Percent, Receipt, BadgeCheck, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { calculateRepasse, WORK_MODES } from "@/lib/pricing";

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function LocksmithFinancialPanel({ locksmith }) {
  const [completed, setCompleted] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!locksmith?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [comp, canc] = await Promise.all([
          base44.entities.ServiceRequest.filter({ locksmith_id: locksmith.id, status: "completed" }, "-created_date"),
          base44.entities.ServiceRequest.filter({ locksmith_id: locksmith.id, status: "cancelled" }, "-created_date"),
        ]);
        setCompleted(comp);
        setCancelled(canc.filter((r) => Number(r.cancellation_fee) > 0));
      } finally {
        setLoading(false);
      }
    };
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [locksmith?.id]);

  const isAppMode = locksmith?.work_mode === "app";
  const commissionRate = WORK_MODES.app.feeValue;
  const monthlyFee = WORK_MODES.livre.feeValue;

  const stats = useMemo(() => {
    let gross = 0;
    let commission = 0;
    let commissionPaid = 0;
    let commissionPending = 0;
    let net = 0;
    let paidCount = 0;

    completed.forEach((r) => {
      const repasse = calculateRepasse({
        price: r.price,
        workMode: locksmith?.work_mode,
        status: r.status,
      });
      gross += repasse.gross;
      commission += repasse.commission;
      net += repasse.locksmithAmount;
      if (isAppMode) {
        if ((r.commission_status || "pending") === "paid") {
          commissionPaid += repasse.commission;
          paidCount += 1;
        } else {
          commissionPending += repasse.commission;
        }
      }
    });

    let cancellationTotal = 0;
    let cancellationAppFee = 0;
    cancelled.forEach((r) => {
      const repasse = calculateRepasse({
        price: r.price,
        workMode: locksmith?.work_mode,
        status: r.status,
        cancellation_locksmith_amount: r.cancellation_locksmith_amount,
        cancellation_app_fee: r.cancellation_app_fee,
      });
      cancellationTotal += repasse.locksmithAmount;
      cancellationAppFee += repasse.appAmount;
      net += repasse.locksmithAmount;
    });

    if (isAppMode) {
      commissionPending = Math.min(commission, Number(locksmith?.pending_cash_commission || 0));
      commissionPaid = Math.max(0, commission - commissionPending);
    }

    return {
      gross,
      commission,
      net,
      count: completed.length,
      commissionPaid,
      commissionPending,
      paidCount,
      cancellationTotal,
      cancellationAppFee,
      cancelledCount: cancelled.length,
    };
  }, [completed, cancelled, isAppMode, locksmith?.work_mode, locksmith?.pending_cash_commission]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-base text-foreground">Painel Financeiro</h3>
          <p className="text-xs text-muted-foreground">Rendimentos acumulados e comissões</p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Bruto acumulado</span>
          </div>
          <p className="font-heading font-bold text-lg text-foreground">{fmtMoney(stats.gross)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{stats.count} serviço(s)</p>
        </div>

        <div className="p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-medium">Líquido acumulado</span>
          </div>
          <p className="font-heading font-bold text-lg text-emerald-600">{fmtMoney(stats.net)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Histórico dos serviços</p>
        </div>
      </div>

      {/* Comissões a pagar — modo app */}
      {isAppMode && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl border border-blue-100 bg-blue-50">
            <div className="flex items-center gap-1.5 text-blue-700 mb-2">
              <Percent className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Comissões do app ({Math.round(commissionRate * 100)}%)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-blue-600/80">Pendente de pagamento</p>
                <p className="font-heading font-bold text-base text-amber-600">{fmtMoney(stats.commissionPending)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stats.count - stats.paidCount} serviço(s)</p>
              </div>
              <div>
                <p className="text-[11px] text-blue-600/80">Já compensada</p>
                <p className="font-heading font-bold text-base text-emerald-600">{fmtMoney(stats.commissionPaid)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stats.paidCount} serviço(s)</p>
              </div>
            </div>
            <div className="flex justify-between text-sm pt-2 mt-2 border-t border-blue-100">
              <span className="font-medium text-blue-700">Total de comissões</span>
              <span className="font-bold text-blue-700">{fmtMoney(stats.commission)}</span>
            </div>
          </div>

          {stats.cancelledCount > 0 && (
            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
              <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                <Receipt className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Taxas de cancelamento recebidas (20%)</span>
              </div>
              <p className="font-heading font-bold text-lg text-amber-700">{fmtMoney(stats.cancellationTotal)}</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">
                {stats.cancelledCount} cancelamento(s) · {fmtMoney(stats.cancellationAppFee)} para o app (5%)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mensalidade — modo livre */}
      {!isAppMode && (
        <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
          <div className="flex items-center gap-1.5 text-amber-700 mb-1">
            <BadgeCheck className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Mensalidade do Modo Livre</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading font-bold text-lg text-amber-700">{fmtMoney(monthlyFee)}/mês</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">
                {locksmith?.monthly_fee_paid ? "Paga neste ciclo" : "Em aberto"}
              </p>
            </div>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${locksmith?.monthly_fee_paid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {locksmith?.monthly_fee_paid ? "Em dia" : "Pendente"}
            </span>
          </div>
        </div>
      )}

      {/* Saldos internos são apenas valores legados; novos repasses vão ao Mercado Pago. */}
      {isAppMode && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
              <Wallet className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Saldo interno a repassar</span>
            </div>
            <p className="font-heading font-bold text-base text-emerald-700">{fmtMoney(locksmith?.wallet_balance)}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-1.5 text-amber-700 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Saque interno solicitado</span>
            </div>
            <p className="font-heading font-bold text-base text-amber-700">{fmtMoney(locksmith?.pending_balance)}</p>
          </div>
        </div>
      )}

      {/* Detalhamento dos serviços */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-sm font-medium text-foreground py-2"
          >
            <span>Detalhamento dos serviços ({completed.length})</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {completed.map((r) => {
                const repasse = calculateRepasse({
                  price: r.price,
                  workMode: locksmith?.work_mode,
                  status: r.status,
                });
                return (
                  <div key={r.id} className="p-2.5 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{r.service_type}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.address}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(r.created_date)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{fmtMoney(repasse.gross)}</p>
                        {isAppMode && (
                          <p className="text-[11px] text-red-500">- {fmtMoney(repasse.commission)}</p>
                        )}
                        <p className="text-xs font-semibold text-emerald-600">{fmtMoney(repasse.locksmithAmount)}</p>
                        {isAppMode && (
                          <span className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${(r.commission_status || "pending") === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {(r.commission_status || "pending") === "paid" ? "Compensada" : "Pendente"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}