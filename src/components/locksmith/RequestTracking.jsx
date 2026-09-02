import React from "react";
import { CheckCircle2, Circle, Phone, MessageCircle, Star } from "lucide-react";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import ReviewForm from "@/components/locksmith/ReviewForm";

const steps = [
  { key: "accepted", label: "Pedido em andamento", desc: "Chaveiro aceitou seu pedido" },
  { key: "on_the_way", label: "A caminho", desc: "O chaveiro está indo até você" },
  { key: "completed", label: "Serviço concluído", desc: "Atendimento finalizado" },
];

export default function RequestTracking({ request, locksmith, onAdvance, onRate, onCall }) {
  const currentIndex = steps.findIndex((s) => s.key === request.status);

  return (
    <div className="space-y-6">
      {/* Locksmith info */}
      {locksmith && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-border">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {locksmith.avatar_url ? (
              <Image src={locksmith.avatar_url} alt={locksmith.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-semibold">
                {locksmith.name?.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-foreground">{locksmith.name}</p>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{locksmith.rating?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">· {locksmith.vehicle}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onCall(locksmith)} className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <Phone className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Status timeline */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const done = i <= currentIndex;
          const Icon = done ? CheckCircle2 : Circle;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Icon className={`w-6 h-6 ${done ? "text-primary" : "text-muted-foreground"}`} />
                {i < steps.length - 1 && <div className={`w-0.5 h-10 ${i < currentIndex ? "bg-primary" : "bg-border"}`} />}
              </div>
              <div className="pb-6">
                <p className={`font-medium text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {request.status !== "completed" ? (
        <Button onClick={onAdvance} className="w-full" size="lg">
          {request.status === "accepted" ? "Confirmar que está a caminho" : "Finalizar serviço"}
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm font-medium text-foreground">Avalie o atendimento</p>
          <ReviewForm
            locksmithId={locksmith?.id}
            locksmithName={locksmith?.name}
            serviceType={request.service_type}
            workMode={locksmith?.work_mode}
            onSubmitted={(r) => onRate(r)}
          />
        </div>
      )}

      {/* Price */}
      {request.key_value != null ? (
        <div className="p-4 rounded-2xl bg-muted space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valor da chave</span><span className="font-medium text-foreground">R$ {request.key_value?.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Mão de obra</span><span className="font-medium text-foreground">R$ {request.labor_cost?.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Locomoção ({request.distance_km?.toFixed(1)} km)</span><span className="font-medium text-foreground">R$ {request.locomotion_cost?.toFixed(2)}</span></div>
          {request.extra_cost > 0 && (
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custos adicionais</span><span className="font-medium text-foreground">R$ {request.extra_cost?.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="font-heading font-semibold text-foreground">Total</span>
            <span className="font-heading font-bold text-lg text-foreground">R$ {request.price?.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center p-4 rounded-2xl bg-muted">
          <span className="text-sm text-muted-foreground">Valor do serviço</span>
          <span className="font-heading font-bold text-lg text-foreground">R$ {request.price?.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}