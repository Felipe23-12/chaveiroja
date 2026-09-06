import React from "react";
import { Zap } from "lucide-react";

/** Seleção de urgência do atendimento (normal / urgente) */
export default function UrgencySelector({ urgency, setUrgency }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">Urgência</label>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setUrgency("normal")}
          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
            urgency === "normal" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          Normal
        </button>
        <button
          onClick={() => setUrgency("urgent")}
          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            urgency === "urgent" ? "border-red-500 bg-red-50 text-red-600" : "border-border text-muted-foreground"
          }`}
        >
          <Zap className="w-4 h-4" /> Urgente
        </button>
      </div>
    </div>
  );
}