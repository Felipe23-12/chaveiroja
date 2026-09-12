import React from "react";
import BrokenKeySelector from "@/components/locksmith/BrokenKeySelector";

export default function OpeningConditionQuestions({ reason, onReasonChange, brokenKey, onBrokenKeyChange, automotive = false }) {
  return <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
    <div>
      <p className="text-sm font-medium text-foreground">O que aconteceu? <span className="text-destructive">*</span></p>
      <p className="text-xs text-muted-foreground mt-1">Essa informação é obrigatória e será enviada ao chaveiro.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {[{ id: automotive ? "key_inside" : "lost_key", label: automotive ? "Esqueci a chave dentro do carro" : "Perdi a chave" }, { id: "lock_problem", label: "A fechadura está com problemas" }].map((item) => (
        <button key={item.id} type="button" onClick={() => onReasonChange(item.id)} className={`rounded-xl border-2 p-3 text-left text-sm font-medium ${reason === item.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
          {item.label}
        </button>
      ))}
    </div>
    {reason === "lock_problem" && <p className="text-xs font-medium text-amber-700">Será incluído um adicional único de R$ 25,00.</p>}
    {!automotive && <BrokenKeySelector value={brokenKey} onChange={onBrokenKeyChange} />}
  </div>;
}