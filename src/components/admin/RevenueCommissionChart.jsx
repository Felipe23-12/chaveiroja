import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

const fmtMoney = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COMMISSION_RATE = 0.15;

function dayKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(key) {
  const [y, m, d] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const PERIOD_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "14 dias", value: 14 },
  { label: "30 dias", value: 30 },
];

export default function RevenueCommissionChart({ requests }) {
  const [period, setPeriod] = useState(14);

  const data = useMemo(() => {
    const paid = requests.filter((r) => r.payment_status === "paid");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const map = {};
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map[dayKey(d)] = { revenue: 0, commission: 0 };
    }

    paid.forEach((r) => {
      const k = dayKey(r.created_date);
      if (map[k]) {
        const price = r.price || 0;
        map[k].revenue += price;
        map[k].commission += Math.round(price * COMMISSION_RATE * 100) / 100;
      }
    });

    let accumulated = 0;
    return Object.keys(map)
      .sort()
      .map((k) => {
        accumulated += map[k].commission;
        return {
          date: dayLabel(k),
          revenue: Math.round(map[k].revenue * 100) / 100,
          accumulatedCommission: Math.round(accumulated * 100) / 100,
        };
      });
  }, [requests, period]);

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalCommission = data.length > 0 ? data[data.length - 1].accumulatedCommission : 0;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">Faturamento diário e comissões acumuladas</span>
        </div>
        <div className="flex gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Faturamento no período</p>
          <p className="font-heading font-bold text-lg text-foreground">{fmtMoney(totalRevenue)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2">
          <p className="text-xs text-emerald-700">Comissões acumuladas (15%)</p>
          <p className="font-heading font-bold text-lg text-emerald-600">{fmtMoney(totalCommission)}</p>
        </div>
      </div>

      <div className="h-64">
        {data.every((d) => d.revenue === 0 && d.accumulatedCommission === 0) ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sem dados de pagamentos no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                formatter={(v, name) => [
                  fmtMoney(v),
                  name === "revenue" ? "Faturamento do dia" : "Comissão acumulada",
                ]}
              />
              <Legend
                formatter={(v) => (v === "revenue" ? "Faturamento diário" : "Comissão acumulada")}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="#0f172a" radius={[4, 4, 0, 0]} name="revenue" />
              <Bar dataKey="accumulatedCommission" fill="#10b981" radius={[4, 4, 0, 0]} name="accumulatedCommission" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}