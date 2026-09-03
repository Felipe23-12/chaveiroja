import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Estado de carregamento com skeleton animado.
 * Substitui spinners soltos por um card com shimmer,
 * transmitindo profissionalismo enquanto dados carregam.
 */
export default function LoadingCard({ label = "Carregando...", icon: Icon = Loader2, className = "" }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      <div className="flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary animate-spin" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="w-full space-y-2 mt-2">
          <div className="h-2.5 rounded-full bg-muted animate-pulse" style={{ width: "80%" }} />
          <div className="h-2.5 rounded-full bg-muted animate-pulse" style={{ width: "60%" }} />
          <div className="h-2.5 rounded-full bg-muted animate-pulse" style={{ width: "90%" }} />
        </div>
      </div>
    </div>
  );
}