import React from "react";
import { Calendar, MapPin, Star, User, Wrench, Wallet } from "lucide-react";
import { getOpeningConditionFee } from "@/lib/openingCondition";

const STATUS = {
  searching: { label: "Procurando", color: "bg-amber-100 text-amber-700" },
  ringing: { label: "Aguardando", color: "bg-amber-100 text-amber-700" },
  accepted: { label: "Aceito", color: "bg-blue-100 text-blue-700" },
  on_the_way: { label: "A caminho", color: "bg-violet-100 text-violet-700" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const PAYMENT = { credit_card: "Cartão de crédito", debit_card: "Cartão de débito", pix: "Pix", dinheiro: "Dinheiro" };

const money = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (d) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Cartão de item do histórico — usado pelo cliente e pelo chaveiro.
 * perspective: "cliente" | "chaveiro" (muda os rótulos de pessoa e nota)
 */
export default function ServiceHistoryCard({ request: r, perspective = "cliente", children }) {
  const st = STATUS[r.status] || STATUS.searching;
  const isCancelled = r.status === "cancelled";
  const finalValue = isCancelled ? r.cancellation_fee : r.price;
  const personLabel = perspective === "cliente" ? r.locksmith_name : r.client_name;
  const isKeyService = ["Confecção de Chave de Carro", "Confecção de Chave de Moto"].includes(r.service_type);
  const hideValueUntilAccepted = perspective === "cliente" && isKeyService && !r.accepted_at && ["searching", "ringing", "cancelled"].includes(r.status);

  return (
    <div className="p-4 rounded-2xl bg-card border border-border fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-semibold text-foreground flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-primary shrink-0" /> {r.service_type}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
            {r.urgency === "urgent" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Urgente</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3.5 h-3.5" /> {date(r.status === "completed" ? r.updated_date : r.created_date)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {isCancelled ? "Taxa cobrada" : "Valor final"}
          </p>
          <p className={`font-heading font-bold text-lg ${isCancelled ? "text-red-600" : "text-foreground"}`}>
            {hideValueUntilAccepted ? "Após aceite" : money(finalValue)}
          </p>
          {getOpeningConditionFee(r) > 0 && !isCancelled && <p className="text-[11px] text-amber-700">Inclui adicional de condição +{money(getOpeningConditionFee(r))}</p>}
          {r.discount_amount > 0 && !isCancelled && (
            <p className="text-[11px] text-emerald-700">Desconto fidelidade −{money(r.discount_amount)}</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{r.address}</span>
        </span>
        {personLabel && (
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 shrink-0" /> {personLabel}
          </span>
        )}
        {r.payment_method && (
          <span className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 shrink-0" /> {PAYMENT[r.payment_method] || r.payment_method}
          </span>
        )}
        {r.distance_km != null && <span>Distância: {Number(r.distance_km).toFixed(1)} km</span>}
      </div>

      {r.status === "completed" && (
        <div className="mt-3 pt-3 border-t border-border">
          {r.rating ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {perspective === "cliente" ? "Sua avaliação:" : "Nota do cliente:"}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                  ))}
                </div>
                <span className="text-sm font-heading font-semibold text-foreground">{Number(r.rating).toFixed(1)}</span>
              </div>
              {r.review && <p className="text-sm text-muted-foreground italic mt-1">"{r.review}"</p>}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {perspective === "cliente" ? "Serviço ainda não avaliado." : "Cliente ainda não avaliou este serviço."}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  );
}