import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, TrendingUp, Receipt, Percent, Loader2, CreditCard, QrCode, Banknote } from "lucide-react";
import { COMMISSION_RATE } from "@/lib/payments";
import FinanceCharts from "@/components/admin/FinanceCharts";
import PendingCreditsCard from "@/components/payment/PendingCreditsCard";
import NotifyMissingMercadoPagoButton from "@/components/admin/NotifyMissingMercadoPagoButton";

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const methodLabel = (m) => {
  const map = { credit_card: "Cartão de Crédito", debit_card: "Cartão de Débito", pix: "Pix" };
  return map[m] || m || "—";
};

const methodIcon = (m) => {
  if (m === "pix") return QrCode;
  if (m === "credit_card" || m === "debit_card") return CreditCard;
  return Banknote;
};

const statusBadge = (s) => {
  const map = {
    pre_authorized: "bg-amber-50 text-amber-600",
    captured: "bg-blue-50 text-blue-600",
    paid: "bg-emerald-50 text-emerald-600",
    cancelled: "bg-red-50 text-red-600",
    refunded: "bg-violet-50 text-violet-600",
    failed: "bg-red-50 text-red-600",
  };
  const label = {
    pre_authorized: "Pré-autorizado",
    captured: "Capturado",
    paid: "Pago",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
    failed: "Falhou",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || "bg-muted text-muted-foreground"}`}>
      {label[s] || s}
    </span>
  );
};

export default function PainelFinanceiroAdmin() {
  const [payments, setPayments] = useState([]);
  const [locksmiths, setLocksmiths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [p, l] = await Promise.all([
          base44.entities.Payment.list("-created_date", 1000),
          base44.entities.Locksmith.list(),
        ]);
        setPayments(p);
        setLocksmiths(l);
      } finally {
        setLoading(false);
      }
    };
    load();
    const unsub = base44.entities.Payment.subscribe(() => load());
    return unsub;
  }, []);

  const locksmithMap = useMemo(() => {
    const map = {};
    locksmiths.forEach((l) => { map[l.id] = l; });
    return map;
  }, [locksmiths]);

  // Totais gerais
  const totals = useMemo(() => {
    let gross = 0;
    let commission = 0;
    let net = 0;
    let paidCount = 0;
    payments.forEach((p) => {
      if (p.status === "paid" || p.status === "captured") {
        gross += p.amount || 0;
        commission += p.commission_amount || 0;
        net += p.net_amount || 0;
        paidCount += 1;
      }
    });
    return { gross, commission, net, paidCount };
  }, [payments]);

  // Líquido acumulado por chaveiro
  const perLocksmith = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (p.status !== "paid" && p.status !== "captured") return;
      const id = p.locksmith_id;
      if (!id) return;
      if (!map[id]) {
        const l = locksmithMap[id];
        map[id] = {
          id,
          name: p.locksmith_name || l?.name || "—",
          workMode: l?.work_mode || "—",
          walletBalance: l?.wallet_balance || 0,
          pendingBalance: l?.pending_balance || 0,
          gross: 0,
          commission: 0,
          net: 0,
          count: 0,
        };
      }
      map[id].gross += p.amount || 0;
      map[id].commission += p.commission_amount || 0;
      map[id].net += p.net_amount || 0;
      map[id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.net - a.net);
  }, [payments, locksmithMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Painel Financeiro Admin</h1>
          <p className="text-sm text-muted-foreground">Pagamentos, comissões e repasses líquidos</p>
        </div>
      </div>

      <PendingCreditsCard />

      <NotifyMissingMercadoPagoButton />

      {/* Gráficos: serviços por mês e comissão por mês */}
      <FinanceCharts />

      {/* Cards de resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Total processado</span>
          </div>
          <p className="font-heading font-bold text-xl text-foreground">{fmtMoney(totals.gross)}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.paidCount} pagamento(s)</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="w-4 h-4 text-blue-600" />
            <span className="text-xs">Comissões ({Math.round(COMMISSION_RATE * 100)}%)</span>
          </div>
          <p className="font-heading font-bold text-xl text-blue-600">{fmtMoney(totals.commission)}</p>
          <p className="text-xs text-muted-foreground mt-1">Receita do app</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="text-xs">Líquido aos chaveiros</span>
          </div>
          <p className="font-heading font-bold text-xl text-emerald-600">{fmtMoney(totals.net)}</p>
          <p className="text-xs text-muted-foreground mt-1">Parcela dos chaveiros antes das tarifas; inclui créditos ainda não repassados</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Receipt className="w-4 h-4" />
            <span className="text-xs">Transações</span>
          </div>
          <p className="font-heading font-bold text-xl text-foreground">{payments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total de registros</p>
        </div>
      </div>

      {/* Líquido acumulado por chaveiro */}
      <section>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">
          Líquido acumulado por chaveiro
        </h2>
        {perLocksmith.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-border">
            <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Chaveiro</th>
                    <th className="px-4 py-2 font-medium">Modo</th>
                    <th className="px-4 py-2 font-medium text-right">Serviços</th>
                    <th className="px-4 py-2 font-medium text-right">Bruto</th>
                    <th className="px-4 py-2 font-medium text-right">Comissão</th>
                    <th className="px-4 py-2 font-medium text-right">Líquido</th>
                    <th className="px-4 py-2 font-medium text-right">Carteira</th>
                  </tr>
                </thead>
                <tbody>
                  {perLocksmith.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground font-medium">{l.name}</td>
                      <td className="px-4 py-2 capitalize">{l.workMode}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{l.count}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{fmtMoney(l.gross)}</td>
                      <td className="px-4 py-2 text-right text-blue-600">- {fmtMoney(l.commission)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-600">{fmtMoney(l.net)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{fmtMoney(l.walletBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground" colSpan={2}>Total</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">{totals.paidCount}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">{fmtMoney(totals.gross)}</td>
                    <td className="px-4 py-2 text-right font-medium text-blue-600">{fmtMoney(totals.commission)}</td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-600">{fmtMoney(totals.net)}</td>
                    <td className="px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Todos os pagamentos */}
      <section>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">
          Todos os pagamentos
        </h2>
        {payments.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-border">
            <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Chaveiro</th>
                    <th className="px-4 py-2 font-medium">Método</th>
                    <th className="px-4 py-2 font-medium text-right">Valor</th>
                    <th className="px-4 py-2 font-medium text-right">Comissão</th>
                    <th className="px-4 py-2 font-medium text-right">Líquido</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const MIcon = methodIcon(p.method);
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(p.pre_authorized_at || p.created_date)}</td>
                        <td className="px-4 py-2 text-foreground">{p.client_name || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{p.locksmith_name || "—"}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <MIcon className="w-3.5 h-3.5" />
                            {methodLabel(p.method)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-foreground">{fmtMoney(p.amount)}</td>
                        <td className="px-4 py-2 text-right text-blue-600">- {fmtMoney(p.commission_amount)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-emerald-600">{fmtMoney(p.net_amount)}</td>
                        <td className="px-4 py-2">{statusBadge(p.status)}{p.collection_mode === "platform_pending" && <p className="mt-1 text-xs text-muted-foreground">{p.transfer_status === "pending" ? `Crédito pendente: ${fmtMoney(p.pending_transfer_amount)}` : p.transfer_status === "under_review" ? "Crédito em revisão" : p.transfer_status === "reversed" ? "Crédito estornado" : "Aguardando pagamento · plataforma"}</p>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}