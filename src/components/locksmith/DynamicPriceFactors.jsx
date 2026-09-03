import React from "react";
import { TrendingUp, TrendingDown, MapPin, Home, Zap, AlertTriangle, Gauge } from "lucide-react";

// Exibe os fatores dinâmicos de precificação (oferta/demanda, região, bairro,
// urgência) como badges informativas, além do aviso de taxa de distância.
export default function DynamicPriceFactors({ price, nearestDistance }) {
  if (!price?.factors) return null;

  const { factors } = price;
  const overThreshold = factors.distanceOverThreshold;

  return (
    <div className="space-y-3">
      {/* Aviso de taxa de distância excedente */}
      {overThreshold && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>Atenção:</strong> O chaveiro mais próximo está a{" "}
            {nearestDistance.toFixed(1)} km. Será cobrada uma taxa adicional de{" "}
            <strong>R$ 0,90 por km</strong> excedente (acima de 20 km).
          </p>
        </div>
      )}

      {/* Badges dos fatores dinâmicos */}
      <div className="flex flex-wrap gap-2">
        <FactorBadge
          icon={factors.supplyDemand.ratio >= 1 ? TrendingUp : TrendingDown}
          label="Oferta/Demanda"
          value={factors.supplyDemand.label}
          tone={
            factors.supplyDemand.multiplier >= 1.05
              ? "high"
              : factors.supplyDemand.multiplier <= 0.9
              ? "low"
              : "neutral"
          }
        />
        {factors.urgency && (
          <FactorBadge icon={Zap} label="Urgência" value="Valor máximo" tone="high" />
        )}
        <FactorBadge
          icon={MapPin}
          label="Região"
          value={factors.region.label}
          tone={factors.region.multiplier < 1 ? "low" : "neutral"}
        />
        <FactorBadge
          icon={Home}
          label="Bairro"
          value={factors.neighborhood.label}
          tone={
            factors.neighborhood.multiplier > 1
              ? "high"
              : factors.neighborhood.multiplier < 1
              ? "low"
              : "neutral"
          }
        />
      </div>

      {/* Indicador de oferta/demanda em tempo real */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 text-xs text-muted-foreground">
        <Gauge className="w-4 h-4 shrink-0" />
        <span>
          <strong className="text-foreground">{factors.onlineLocksmiths}</strong> chaveiros online ·{" "}
          <strong className="text-foreground">{factors.activeRequests}</strong> solicitações ativas ·
          ajuste total ×{factors.combinedMultiplier}
        </span>
      </div>
    </div>
  );
}

function FactorBadge({ icon: Icon, label, value, tone }) {
  const toneClasses = {
    high: "bg-red-50 text-red-700 border-red-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    neutral: "bg-muted text-muted-foreground border-border",
  };
  const iconColor = {
    high: "text-red-500",
    low: "text-emerald-500",
    neutral: "text-muted-foreground",
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${toneClasses[tone]}`}>
      <Icon className={`w-3.5 h-3.5 ${iconColor[tone]}`} />
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
}