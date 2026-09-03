import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import { Loader2, BarChart3, LineChart } from "lucide-react";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function monthKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [, m] = key.split("-");
  return MONTHS_SHORT[parseInt(m, 10) - 1];
}

export default function FinanceCharts() {
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [reqs, pays] = await Promise.all([
          base44.entities.ServiceRequest.list("-created_date", 1000),
          base44.entities.Payment.list("-created_date", 1000),
        ]);
        setRequests(reqs);
        setPayments(pays);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Agrupa por mês: serviços concluídos + comissão recebida
  const monthly = useMemo(() => {
    const map = {};

    // Serviços concluídos (ServiceRequest status completed)
    requests.forEach((r) => {
      if (r.status !== "completed") return;
      const key = monthKey(r.accepted_at || r.created_date);
      if (!map[key]) map[key] = { key, label: monthLabel(key), services: 0, commission: 0, gross: 0 };
      map[key].services += 1;
    });

    // Comissões recebidas (Payment paid/captured)
    payments.forEach((p) => {
      if (p.status !== "paid" && p.status !== "captured") return;
      const key = monthKey(p.captured_at || p.pre_authorized_at || p.created_date);
      if (!map[key]) map[key] = { key, label: monthLabel(key), services: 0, commission: 0, gross: 0 };
      map[key].commission += p.commission_amount || 0;
      map[key].gross += p.amount || 0;
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [requests, payments]);

  const totals = useMemo(() => {
    const totalServices = monthly.reduce((s, m) => s + m.services, 0);
    const totalCommission = monthly.reduce((s, m) => s + m.commission, 0);
    return { totalServices, totalCommission };
  }, [monthly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (monthly.length === 0) {
    return (
      <div className="text-center py-10 rounded-xl border border-dashed border-border">
        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sem dados suficientes para os gráficos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico: Serviços concluídos por mês */}
      <div className="rounded-xl border border-border bg-white p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-base text-foreground">
            Serviços concluídos por mês
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v) => [`${v} serviço(s)`, "Concluídos"]}
              />
              <Bar dataKey="services" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Total no período: <strong className="text-foreground">{totals.totalServices}</strong> serviço(s) concluído(s).
        </p>
      </div>

      {/* Gráfico: Comissão ganha por mês */}
      <div className="rounded-xl border border-border bg-white p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <LineChart className="w-5 h-5 text-blue-600" />
          <h3 className="font-heading font-semibold text-base text-foreground">
            Comissão recebida por mês
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                cursor={{ stroke: "#3b82f6", strokeWidth: 1 }}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v) => [fmtMoney(v), "Comissão"]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="commission"
                name="Comissão"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#commissionGrad)"
                dot={{ r: 3, fill: "#3b82f6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Total no período: <strong className="text-blue-600">{fmtMoney(totals.totalCommission)}</strong> em comissões.
        </p>
      </div>
    </div>
  );
}