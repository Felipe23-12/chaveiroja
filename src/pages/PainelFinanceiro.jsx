import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, TrendingUp, Receipt, BadgeCheck, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORK_MODES } from "@/lib/pricing";

export default function PainelFinanceiro() {
  const [locksmiths, setLocksmiths] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [me, setMe] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingFee, setTogglingFee] = useState(false);

  useEffect(() => {
    base44.entities.Locksmith.list().then((list) => {
      setLocksmiths(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    base44.entities.Locksmith.get(selectedId).then(setMe);
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ locksmith_id: selectedId, status: "completed" }, "-created_date")
        .then(setCompleted)
        .then(() =>
          base44.entities.ServiceRequest.filter({ locksmith_id: selectedId, status: "cancelled" }, "-created_date")
        )
        .then((list) => setCancelled(list.filter((r) => Number(r.cancellation_fee) > 0)))
        .finally(() => setLoading(false));
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [selectedId]);

  const isAppMode = me?.work_mode === "app";
  const commissionRate = WORK_MODES.app.feeValue; // 0.15
  const monthlyFee = WORK_MODES.livre.feeValue; // 50

  const stats = useMemo(() => {
    let gross = 0;
    let commission = 0;
    let commissionPaid = 0;
    let commissionPending = 0;
    let paidCount = 0;
    completed.forEach((r) => {
      const price = Number(r.price) || 0;
      gross += price;
      if (isAppMode) {
        const comm = price * commissionRate;
        commission += comm;
        if ((r.commission_status || "pending") === "paid") {
          commissionPaid += comm;
          paidCount += 1;
        } else {
          commissionPending += comm;
        }
      }
    });
    let cancellationTotal = 0;
    cancelled.forEach((r) => {
      cancellationTotal += Number(r.cancellation_locksmith_amount) || 0;
    });
    const net = gross - commission + cancellationTotal;
    return {
      gross,
      commission,
      net,
      count: completed.length,
      commissionPaid,
      commissionPending,
      paidCount,
      cancellationTotal,
      cancelledCount: cancelled.length,
    };
  }, [completed, cancelled, isAppMode]);

  const handleToggleCommission = async (r) => {
    const newStatus = (r.commission_status || "pending") === "paid" ? "pending" : "paid";
    await base44.entities.ServiceRequest.update(r.id, { commission_status: newStatus });
    setCompleted((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, commission_status: newStatus } : x))
    );
  };

  const handleToggleFee = async () => {
    if (!me) return;
    setTogglingFee(true);
    try {
      await base44.entities.Locksmith.update(me.id, { monthly_fee_paid: !me.monthly_fee_paid });
      setMe({ ...me, monthly_fee_paid: !me.monthly_fee_paid });
    } finally {
      setTogglingFee(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground">Saldo, mensalidade e comissões</p>
        </div>
      </div>

      {/* Seleção de perfil */}
      <div className="space-y-1.5 mb-5">
        <Label>Selecione seu perfil</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="Escolha um chaveiro" /></SelectTrigger>
          <SelectContent>
            {locksmiths.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} · {l.work_mode === "livre" ? "Livre" : "App"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {me && (
        <div className="p-4 rounded-xl border border-border bg-card mb-5">
          <p className="font-medium text-foreground">{me.name}</p>
          <p className="text-xs text-muted-foreground">
            Modo {me.work_mode === "livre" ? "Livre" : "Aplicativo"}
          </p>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Saldo atual</span>
          </div>
          <p className="font-heading font-bold text-2xl text-emerald-700">
            R$ {stats.net.toFixed(2)}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Líquido recebido</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-foreground mb-1">
            {isAppMode ? (
              <>
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium">Comissões (15%)</span>
              </>
            ) : (
              <>
                <BadgeCheck className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium">Mensalidade</span>
              </>
            )}
          </div>
          {isAppMode ? (
            <>
              <p className="font-heading font-bold text-2xl text-foreground">
                R$ {stats.commission.toFixed(2)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total descontado</p>
            </>
          ) : (
            <>
              <p className="font-heading font-bold text-lg text-foreground">
                R$ {monthlyFee.toFixed(2)}/mês
              </p>
              <p className="text-[11px] mt-0.5">
                <span className={me?.monthly_fee_paid ? "text-emerald-600" : "text-red-600"}>
                  {me?.monthly_fee_paid ? "Paga" : "Pendente"}
                </span>
              </p>
            </>
          )}
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-foreground mb-1">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Serviços concluídos</span>
          </div>
          <p className="font-heading font-bold text-2xl text-foreground">{stats.count}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Bruto: R$ {stats.gross.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Status da mensalidade — modo livre */}
      {!isAppMode && me && (
        <div className="p-4 rounded-xl border border-border bg-card mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${me.monthly_fee_paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {me.monthly_fee_paid ? <BadgeCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Mensalidade do Modo Livre</p>
              <p className="text-xs text-muted-foreground">
                {me.monthly_fee_paid
                  ? `R$ ${monthlyFee.toFixed(2)} pagos neste ciclo`
                  : `R$ ${monthlyFee.toFixed(2)} em aberto`}
              </p>
            </div>
          </div>
          <Button
            variant={me.monthly_fee_paid ? "outline" : "default"}
            size="sm"
            onClick={handleToggleFee}
            disabled={togglingFee}
          >
            {togglingFee ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            {me.monthly_fee_paid ? "Reverter" : "Marcar como paga"}
          </Button>
        </div>
      )}

      {/* Resumo de compensação — modo app */}
      {isAppMode && completed.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <BadgeCheck className="w-4 h-4" />
              <span className="text-xs font-medium">Comissões compensadas</span>
            </div>
            <p className="font-heading font-bold text-lg text-emerald-700">
              R$ {stats.commissionPaid.toFixed(2)}
            </p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">{stats.paidCount} serviço(s)</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Pendentes de processamento</span>
            </div>
            <p className="font-heading font-bold text-lg text-amber-700">
              R$ {stats.commissionPending.toFixed(2)}
            </p>
            <p className="text-[11px] text-amber-600/80 mt-0.5">{completed.length - stats.paidCount} serviço(s)</p>
          </div>
        </div>
      )}

      {/* Taxas de cancelamento recebidas — modo app */}
      {isAppMode && cancelled.length > 0 && (
        <div className="mb-6">
          <h2 className="font-heading font-semibold text-lg text-foreground mb-3">
            Taxas de cancelamento recebidas (20%)
          </h2>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 mb-3">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <BadgeCheck className="w-4 h-4" />
              <span className="text-xs font-medium">Total recebido de cancelamentos</span>
            </div>
            <p className="font-heading font-bold text-2xl text-emerald-700">
              R$ {stats.cancellationTotal.toFixed(2)}
            </p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">
              {stats.cancelledCount} cancelamento(s) com taxa · 5% repassado ao app
            </p>
          </div>
          <div className="space-y-2">
            {cancelled.map((r) => {
              const fee = Number(r.cancellation_fee) || 0;
              const locksmithAmt = Number(r.cancellation_locksmith_amount) || 0;
              const appFee = Number(r.cancellation_app_fee) || 0;
              return (
                <div key={r.id} className="p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.service_type}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.address}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(r.created_date).toLocaleDateString("pt-BR")} · Cancelado após confirmação
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-muted-foreground">Taxa do cliente (25%)</p>
                      <p className="text-sm font-medium text-foreground">R$ {fee.toFixed(2)}</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5">+ R$ {locksmithAmt.toFixed(2)} para você (20%)</p>
                      <p className="text-[11px] text-muted-foreground">R$ {appFee.toFixed(2)} para o app (5%)</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comissões descontadas nos serviços concluídos */}
      <h2 className="font-heading font-semibold text-lg text-foreground mb-3">
        {isAppMode ? "Comissões descontadas (15%)" : "Serviços concluídos"}
      </h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : completed.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-border">
          <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum serviço concluído ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {completed.map((r) => {
            const price = Number(r.price) || 0;
            const comm = isAppMode ? price * commissionRate : 0;
            const net = price - comm;
            return (
              <div key={r.id} className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.service_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.address}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(r.created_date).toLocaleDateString("pt-BR")}
                    </p>
                    {isAppMode && (
                      <span
                        className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          (r.commission_status || "pending") === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {(r.commission_status || "pending") === "paid" ? (
                          <><BadgeCheck className="w-3 h-3" /> Comissão compensada</>
                        ) : (
                          <><Clock className="w-3 h-3" /> Comissão pendente</>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-sm font-medium text-foreground">R$ {price.toFixed(2)}</p>
                    {isAppMode && (
                      <p className="text-[11px] text-red-500">- R$ {comm.toFixed(2)} (15%)</p>
                    )}
                    <p className="text-sm font-semibold text-emerald-600">R$ {net.toFixed(2)}</p>
                    {isAppMode && (
                      <Button
                        size="sm"
                        variant={(r.commission_status || "pending") === "paid" ? "outline" : "default"}
                        className="h-7 text-xs"
                        onClick={() => handleToggleCommission(r)}
                      >
                        {(r.commission_status || "pending") === "paid" ? "Reverter" : "Marcar compensada"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}