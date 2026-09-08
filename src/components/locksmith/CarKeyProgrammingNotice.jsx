import React from "react";
import { AlertTriangle, Wifi } from "lucide-react";

/**
 * Avisa o cliente quando o veículo exige programação online paga (adicional
 * fixo de R$ 250) ou quando a chave só pode ser programada na concessionária.
 */
export default function CarKeyProgrammingNotice({ programming, hidePriceDetails = false }) {
  if (!programming || (!programming.dealerOnly && !programming.onlineFee)) return null;

  if (programming.dealerOnly) {
    return (
      <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 flex gap-2.5">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-700">Somente concessionária</p>
          <p className="text-xs text-red-600 mt-0.5">{programming.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50 flex gap-2.5">
      <Wifi className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-700">
          {hidePriceDetails ? "Programação online necessária" : `Programação online: + R$ ${programming.onlineFee.toFixed(2)}`}
        </p>
        <p className="text-xs text-amber-600 mt-0.5">{hidePriceDetails ? "Este veículo exige programação online para confeccionar a chave." : programming.reason}</p>
      </div>
    </div>
  );
}