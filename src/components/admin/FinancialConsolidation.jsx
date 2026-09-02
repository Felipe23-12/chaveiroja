import React, { useMemo, useState } from "react";
import { TrendingUp, CheckCircle2, Clock, Wallet } from "lucide-react";
import { calculateRepasse } from "@/lib/pricing";

const fmtMoney = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthKey = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key) => {
  if (!key) return "";
  const [y, m] = key.split("-");
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[parseInt(m) - 1]} ${y}`;
};

export default function FinancialConsolidation({ requests, locksmiths }) {
  const locksmithMap = useMemo(() => {
    const map = {};
    locksmiths.forEach((l) => { map[l.id] = l; });
    return map;
  }, [locksmiths]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    requests.forEach((r) => {
      const k = monthKey(r.created_date);
      if (k) set.add(k);
    });
    return Array.from(set).sort().reverse();
  }, [requests]);

  const [selectedMonth, setSelectedMonth] = useState("");

  const monthReq = useMemo(() => {
    if (!selectedMonth) return requests;
    return requests.filter((r) => monthKey(r.created_date) === selectedMonth);
  }, [requests, selectedMonth]);

  const summary = useMemo(() => {
    let grossRevenue = 0;
    let paidCommissions = 0;
    let pendingRepasse = 0;
    const perLocksmith = {};

    monthReq.forEach((r) => {
      if (r.status !== "completed" && r.status !== "cancelled") return;

      const l = locksmithMap[r.locksmith_id];
      const workMode = l?.work_mode || "app";

      const repasse = calculateRepasse({
        price: r.price,
        workMode,
        status: r.status,
        cancellation_locksmith_amount: r.cancellation_locksmith_amount,
        cancellation_app_fee: r.cancellation_app_fee,
      });

      if (r.status === "completed") {
        grossRevenue += repasse.gross;
      }

      if (r.commission_status === "paid") {
        paidCommissions += repasse.appAmount;
      } else {
        pendingRepasse += repasse.locksmithAmount;
      }

      if (!perLocksmith[r.locksmith_id]) {
        perLocksmith[r.locksmith_id] = {
          name: r.locksmith_name || l?.name || "—",
          workMode,
          pending: 0,
          paid: 0,
          count: 0,
        };
      }
      if (r.commission_status === "paid") {
        perLocksmith[r.locksmith_id].paid += repasse.appAmount;
      } else {
        perLocksmith[r.locksmith_id].pending += repasse.locksmithAmount;
      }
      perLocksmith[r.locksmith_id].count += 1;
    });

    return {
      grossRevenue,
      paidCommissions,
      pendingRepasse,
      perLocksmith: Object.values(perLocksmith).filter((p) => p.pending > 0 || p.paid > 0),
    };
  }, [monthReq, locksmithMap]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
          <Wallet className="w-5 h-5" /> Consolidação Financeira
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Mês:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todos os meses</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Faturamento total</span>
          </div>
          <p className="font-heading font-bold text-xl text-foreground">{fmtMoney(summary.grossRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Serviços concluídos</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs">Comissões pagas (app)</span>
          </div>
          <p className="font-heading font-bold text-xl text-emerald-600">{fmtMoney(summary.paidCommissions)}</p>
          <p className="text-xs text-muted-foreground mt-1">Já compensadas</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs">Pendente de repasse</span>
          </div>
          <p className="font-heading font-bold text-xl text-amber-600">{fmtMoney(summary.pendingRepasse)}</p>
          <p className="text-xs text-muted-foreground mt-1">A repassar aos chaveiros</p>
        </div>
      </div>

      {summary.perLocksmith.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium text-foreground">Repasse por chaveiro</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Chaveiro</th>
                  <th className="px-4 py-2 font-medium">Modo</th>
                  <th className="px-4 py-2 font-medium">Serviços</th>
                  <th className="px-4 py-2 font-medium">Pendente</th>
                  <th className="px-4 py-2 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody>
                {summary.perLocksmith.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{p.name}</td>
                    <td className="px-4 py-2 capitalize">{p.workMode}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.count}</td>
                    <td className="px-4 py-2 font-medium text-amber-600">{fmtMoney(p.pending)}</td>
                    <td className="px-4 py-2 font-medium text-emerald-600">{fmtMoney(p.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}