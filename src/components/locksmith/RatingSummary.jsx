import React from "react";
import { Star } from "lucide-react";

// Exibe estrelas preenchidas proporcionalmente à nota (0-5)
export function RatingStars({ value = 0, size = "w-4 h-4", className = "" }) {
  const v = Number(value) || 0;
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${v >= n ? "fill-amber-400 text-amber-400" : v >= n - 0.5 ? "fill-amber-200 text-amber-400" : "fill-transparent text-border"}`}
        />
      ))}
    </div>
  );
}

// Resumo proeminente da avaliação para o perfil público
export default function RatingSummary({ rating = 0, reviewsCount = 0, compact = false }) {
  const r = Number(rating) || 0;
  const count = Number(reviewsCount) || 0;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="text-xs font-bold text-foreground">{r.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-amber-200 bg-amber-50">
      <div className="text-center flex-shrink-0">
        <p className="font-heading font-bold text-3xl text-foreground leading-none">{r.toFixed(1)}</p>
        <RatingStars value={r} size="w-3.5 h-3.5" className="mt-1.5 justify-center" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Avaliação dos clientes</p>
        <p className="text-xs text-muted-foreground">
          {count > 0
            ? `${count} ${count === 1 ? "avaliação" : "avaliações"} de clientes`
            : "Ainda sem avaliações"}
        </p>
      </div>
    </div>
  );
}