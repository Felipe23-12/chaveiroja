import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ArrowDownToLine, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestWithdrawal } from "@/lib/payments";

const STATUS_CONFIG = {
  requested: { label: "Solicitado", icon: Clock, color: "text-amber-600 bg-amber-50" },
  processing: { label: "Processando", icon: Loader2, color: "text-blue-600 bg-blue-50" },
  completed: { label: "Concluído", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  failed: { label: "Falhou", icon: XCircle, color: "text-red-600 bg-red-50" },
};

export default function WithdrawalSection({ locksmith, onWithdrawalMade }) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [pixKeyValue, setPixKeyValue] = useState("");
  const [bankName, setBankName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWithdrawals = () => {
    if (!locksmith?.id) return;
    base44.entities.Withdrawal.filter({ locksmith_id: locksmith.id }, "-created_date")
      .then(setWithdrawals)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWithdrawals();
    const unsub = base44.entities.Withdrawal.subscribe(() => loadWithdrawals());
    return unsub;
  }, [locksmith?.id]);

  const handleSubmit = async () => {
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Informe um valor válido");
      return;
    }
    if (!pixKeyValue.trim()) {
      setError("Informe sua chave Pix");
      return;
    }
    setSubmitting(true);
    try {
      await requestWithdrawal({
        locksmithId: locksmith.id,
        locksmithName: locksmith.name,
        amount: Number(amount),
        pixKeyType,
        pixKeyValue: pixKeyValue.trim(),
        bankName: bankName.trim(),
      });
      setAmount("");
      setPixKeyValue("");
      setBankName("");
      setShowForm(false);
      onWithdrawalMade?.();
    } catch (e) {
      setError(e.message || "Erro ao solicitar saque");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          disabled={!locksmith?.wallet_balance}
          className="w-full"
          variant="outline"
        >
          <ArrowDownToLine className="w-4 h-4 mr-2" />
          Solicitar saque
        </Button>
      ) : (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div>
            <Label className="text-xs">Valor do saque</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Disponível: R$ {(locksmith?.wallet_balance || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <Label className="text-xs">Tipo de chave Pix</Label>
            <Select value={pixKeyType} onValueChange={setPixKeyType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Chave Pix de destino</Label>
            <Input
              placeholder="Digite sua chave Pix"
              value={pixKeyValue}
              onChange={(e) => setPixKeyValue(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Banco de destino (opcional)</Label>
            <Input
              placeholder="Ex: Nubank, Itaú, Bradesco..."
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
              Confirmar saque
            </Button>
          </div>
        </div>
      )}

      {/* Histórico de saques */}
      {withdrawals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Histórico de saques</h3>
          {withdrawals.map((w) => {
            const cfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.requested;
            const Icon = cfg.icon;
            return (
              <div key={w.id} className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">R$ {(w.amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Pix: {w.pix_key_value}
                    </p>
                    {w.bank_name && <p className="text-[11px] text-muted-foreground">{w.bank_name}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(w.created_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color} shrink-0`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && withdrawals.length === 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}