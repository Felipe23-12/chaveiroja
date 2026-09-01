import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Briefcase, Check, Loader2, Wallet, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WORK_MODES, calculateCommission } from "@/lib/pricing";

export default function LocksmithProfile() {
  const [locksmiths, setLocksmiths] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = locksmiths.find((l) => l.id === selectedId);

  useEffect(() => {
    base44.entities.Locksmith.list()
      .then((data) => {
        setLocksmiths(data);
        if (data.length) setSelectedId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const setMode = (mode) => {
    setSaving(true);
    base44.entities.Locksmith.update(selectedId, { work_mode: mode })
      .then((updated) => {
        setLocksmiths((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      })
      .finally(() => setSaving(false));
  };

  const setCustomPrice = (value) => {
    setSaving(true);
    base44.entities.Locksmith.update(selectedId, { custom_price_base: Number(value) || 0 })
      .then((updated) => setLocksmiths((prev) => prev.map((l) => (l.id === updated.id ? updated : l))))
      .finally(() => setSaving(false));
  };

  const payMonthly = () => {
    setSaving(true);
    base44.entities.Locksmith.update(selectedId, { monthly_fee_paid: true })
      .then((updated) => setLocksmiths((prev) => prev.map((l) => (l.id === updated.id ? updated : l))))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Modo de Trabalho</h1>
          <p className="text-sm text-muted-foreground">Defina como você atende pelo app</p>
        </div>
      </div>

      {/* Selecionar chaveiro */}
      <div className="mb-6">
        <label className="text-sm font-medium text-foreground mb-1.5 block">Chaveiro</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          {locksmiths.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} · {l.specialty}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="space-y-4">
          {/* Modos */}
          <div className="grid grid-cols-1 gap-3">
            <ModeCard
              mode="livre"
              active={selected.work_mode === "livre"}
              onClick={() => setMode("livre")}
              saving={saving}
            />
            <ModeCard
              mode="app"
              active={selected.work_mode === "app"}
              onClick={() => setMode("app")}
              saving={saving}
            />
          </div>

          {/* Configuração modo livre */}
          {selected.work_mode === "livre" && (
            <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Valor base do seu serviço (R$)
                </label>
                <Input
                  type="number"
                  value={selected.custom_price_base || ""}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Ex: 150"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Você define o valor. Adicionais (miolo, etc.) somam ao valor base.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Assinatura mensal</span>
                </div>
                <span className="font-semibold text-foreground">R$ 50,00 / mês</span>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-xl ${
                selected.monthly_fee_paid ? "bg-green-50" : "bg-amber-50"
              }`}>
                <span className="text-sm font-medium">
                  {selected.monthly_fee_paid ? "Mensalidade paga" : "Mensalidade pendente"}
                </span>
                {!selected.monthly_fee_paid && (
                  <Button size="sm" onClick={payMonthly} disabled={saving}>
                    Pagar R$ 50
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Configuração modo app */}
          {selected.work_mode === "app" && (
            <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                O app calcula o valor ofertado ao cliente conforme serviço, horário e disponibilidade.
                Você recebe o valor do serviço descontada a comissão.
              </p>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Comissão do app</span>
                </div>
                <span className="font-semibold text-foreground">15% por serviço</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <p className="text-xs text-muted-foreground">Exemplo: serviço de R$ 150,00</p>
                <div className="flex justify-between text-sm mt-1">
                  <span>Comissão do app (15%)</span>
                  <span className="font-medium text-red-600">- R$ {calculateCommission(150, "app").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="font-medium">Você recebe</span>
                  <span className="font-bold text-emerald-700">R$ {(150 - calculateCommission(150, "app")).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeCard({ mode, active, onClick, saving }) {
  const config = WORK_MODES[mode];
  const Icon = mode === "livre" ? Wallet : Percent;
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`text-left p-4 rounded-2xl border-2 transition-all flex gap-3 ${
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-heading font-semibold text-foreground">{config.label}</p>
          {active && <Check className="w-4 h-4 text-primary" />}
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        <p className="text-xs font-medium text-foreground mt-1">{config.fee}</p>
      </div>
    </button>
  );
}