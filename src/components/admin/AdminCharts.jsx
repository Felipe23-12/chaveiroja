import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { ClipboardList, Wallet } from "lucide-react";

const fmtMoney = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const OPEN_STATUSES = ["searching", "ringing", "accepted", "on_the_way"];

const STATUS_LABELS = {
  searching: "Buscando",
  ringing: "Chamando",
  accepted: "Aceito",
  on_the_way: "A caminho",
};

const STATUS_COLORS = {
  searching: "#f59e0b",
  ringing: "#3b82f6",
  accepted: "#8b5cf6",
  on_the_way: "#10b981",
};

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export default function AdminCharts({ requests }) {
  const openData = useMemo(() => {
    const counts = OPEN_STATUSES.map((s) => ({
      status: STATUS_LABELS[s],
      total: requests.filter((r) => r.status === s).length,
      color: STATUS_COLORS[s],
    }));
    return counts;
  }, [requests]);

  const openTotal = openData.reduce((s, d) => s + d.total, 0);

  const volumeData = useMemo(() => {
    const map = {};
    requests
      .filter((r) => r.status === "completed")
      .forEach((r) => {
        const k = monthKey(r.created_date);
        map[k] = (map[k] || 0) + (r.price || 0);
      });
    return Object.keys(map)
      .sort()
      .slice(-6)
      .map((k) => ({ month: monthLabel(k), volume: Math.round(map[k] * 100) / 100 }));
  }, [requests]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="w-4 h-4" />
            <span className="text-sm font-medium">Serviços em aberto</span>
          </div>
          <span className="font-heading font-bold text-lg text-foreground">{openTotal}</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={openData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {openData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">Volume financeiro por mês</span>
          </div>
          <span className="font-heading font-bold text-lg text-foreground">
            {fmtMoney(volumeData.reduce((s, d) => s + d.volume, 0))}
          </span>
        </div>
        <div className="h-56">
          {volumeData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados de serviços concluídos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(v) => [fmtMoney(v), "Volume"]}
                />
                <Bar dataKey="volume" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}