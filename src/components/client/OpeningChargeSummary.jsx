import React from "react";
import { AlertTriangle } from "lucide-react";
import { getOpeningConditionFee, hasLocksmithConditionCorrection, isOpeningRequest } from "@/lib/openingCondition";

export default function OpeningChargeSummary({ request }) {
  const additional = getOpeningConditionFee(request);
  if (!isOpeningRequest(request) || additional <= 0) return null;
  const base = Math.max(0, Number(request.price || 0) - additional);
  return <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 space-y-2">
    <div className="flex items-center gap-2 text-warning"><AlertTriangle className="w-4 h-4" /><p className="text-sm font-semibold">Adicional de condição da abertura</p></div>
    <div className="flex justify-between text-sm"><span>Valor do serviço</span><span>R$ {base.toFixed(2)}</span></div>
    <div className="flex justify-between text-sm"><span>Fechadura com problema/chave quebrada</span><span>R$ {additional.toFixed(2)}</span></div>
    <div className="flex justify-between border-t border-warning/40 pt-2 font-bold"><span>Total</span><span>R$ {Number(request.price || 0).toFixed(2)}</span></div>
    {hasLocksmithConditionCorrection(request) && <p className="text-xs text-warning">Condição identificada no local pelo chaveiro e comprovada com fotos.</p>}
  </div>;
}