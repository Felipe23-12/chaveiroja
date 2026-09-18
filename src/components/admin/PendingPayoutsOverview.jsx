import React, { useState, useCallback, useEffect } from "react";
import { Wallet, Download, RefreshCw, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeCsv = (val) => {
  const s = String(val ?? "");
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const todayFileName = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `repasses-pendentes-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
};

export default function PendingPayoutsOverview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [credits, setCredits] = useState([]);
  const [creditsTotal, setCreditsTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wResult, cResult] = await Promise.all([
        loadWithdrawals(),
        loadCredits(),
      ]);
      setWithdrawals(wResult.items);
      setWithdrawalsTotal(wResult.total);
      setCredits(cResult.items);
      setCreditsTotal(cResult.total);
    } catch (e) {
      setError(e?.message || "Falha ao carregar repasses pendentes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPending = withdrawalsTotal + creditsTotal;

  const handleExport = () => {
    const rows = [
      ["Tipo", "Chaveiro", "Valor", "Data", "Status"],
      ...withdrawals.map((w) => [
        "Saque",
        w.locksmith_name || "—",
        w.amount != null ? Number(w.amount).toFixed(2) : "0.00",
        w.requested_at || w.created_date || "",
        w.status || "",
      ]),
      ...credits.map((c) => [
        "Crédito pendente",
        c.locksmith_name || "—",
        c.amount != null ? Number(c.amount).toFixed(2) : "0.00",
        c.date || "",
        c.status || "",
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsv).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = todayFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3 text-foreground">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Repasses pendentes aos chaveiros
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] gap-1.5"
            onClick={handleExport}
            disabled={loading || (withdrawals.length === 0 && credits.length === 0)}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] gap-1.5"
            onClick={load}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </Button>
        </div>
      </div>

      {loading && withdrawals.length === 0 && credits.length === 0 ? (
        <p className="flex gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Consultando saques e créditos pendentes...
        </p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Total pendente de repasse aos chaveiros</p>
            <p className="font-heading font-bold text-2xl text-primary">{fmtMoney(totalPending)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {fmtMoney(withdrawalsTotal)} em {withdrawals.length} saque(s) solicitado(s) +{" "}
              {fmtMoney(creditsTotal)} em {credits.length} crédito(s) pendente(s)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Saques solicitados</p>
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum saque pendente.</p>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="border-t border-border pt-1.5 text-sm flex justify-between gap-2">
                    <span className="truncate">{w.locksmith_name || "—"}</span>
                    <strong className="whitespace-nowrap">{fmtMoney(w.amount)}</strong>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Créditos pendentes</p>
              {credits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum crédito pendente.</p>
              ) : (
                credits.map((c) => (
                  <div key={c.id} className="border-t border-border pt-1.5 text-sm flex justify-between gap-2">
                    <span className="truncate">{c.locksmith_name || "—"}</span>
                    <strong className="whitespace-nowrap">{fmtMoney(c.amount)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Visão combinada de leitura — as ações de concluir saque e marcar repasse continuam nas telas originais.
          </p>
        </>
      )}
    </section>
  );
}

async function loadWithdrawals() {
  const all = await base44.entities.Withdrawal.list("-created_date", 200);
  const pending = all.filter((w) => w.status === "requested" || w.status === "processing");
  const total = pending.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  return { items: pending, total };
}

async function loadCredits() {
  const items = [];
  let total = 0;
  let page = 0;
  let hasMore = true;
  let guard = 0;
  while (hasMore && guard < 100) {
    const res = await base44.functions.invoke("mercadoPagoPayment", {
      action: "get_pending_credits",
      page,
    });
    const data = res?.data || res;
    if (Array.isArray(data?.items)) items.push(...data.items);
    total += Number(data?.total || 0);
    hasMore = !!data?.has_more;
    page += 1;
    guard += 1;
  }
  return { items, total };
}