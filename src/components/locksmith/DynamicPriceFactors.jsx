import React from "react";
import { TrendingUp, TrendingDown, MapPin, Home, Zap, AlertTriangle, Gauge, CalendarClock, CloudRain } from "lucide-react";
import WeatherSurgeNotice from "@/components/locksmith/WeatherSurgeNotice";

// Exibe os fatores dinâmicos de precificação (oferta/demanda, região, bairro,
// urgência) como badges informativas, além do aviso de taxa de distância.
export default function DynamicPriceFactors({ price, nearestDistance, assumedNearby = false }) {
  if (!price?.factors || price.factors.fixed) return null;

  const { factors } = price;
  const overThreshold = factors.distanceOverThreshold;

  return (
    <div className="space-y-3">
      <WeatherSurgeNotice weather={factors.weather} />

      {/* Estimativa considerando chaveiro dentro do raio de busca */}
      {assumedNearby && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-success/10 border border-success/30 text-success">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            Valor estimado considerando um chaveiro <strong>dentro do raio de busca escolhido</strong>,
            sem taxa de quilometragem. Chaveiros além desse raio não são exibidos — ao escolher{" "}
            <strong>30 km ou 50 km</strong>, aparecem os profissionais mais distantes e o valor passa a
            incluir <strong>R$ 0,90 por km acima de 20 km</strong>.
          </p>
        </div>
      )}

      {/* Aviso de taxa de distância excedente */}
      {!assumedNearby && overThreshold && nearestDistance != null && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>Atenção:</strong> O chaveiro mais próximo está a{" "}
            {nearestDistance.toFixed(1)} km. Serão cobrados{" "}
            <strong>R$ 0,90 por km</strong> excedente (acima de 20 km) — adicional de{" "}
            <strong>R$ {Number(price.distanceFee || 0).toFixed(2)}</strong> neste atendimento.
          </p>
        </div>
      )}

      {/* Aviso de fim de semana / feriado (valores no topo da faixa) */}
      {factors.timeTier?.tier === "high" && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
          <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>{factors.timeTier.label}.</strong> Os valores estão sendo cobrados no topo da faixa definida para o modo aplicativo.
          </p>
        </div>
      )}

      {/* Badges dos fatores dinâmicos */}
      <div className="flex flex-wrap gap-2">
        {factors.timeTier && (
          <FactorBadge
            icon={CalendarClock}
            label="Horário"
            value={factors.timeTier.label}
            tone={
              factors.timeTier.tier === "high"
                ? "high"
                : factors.timeTier.tier === "low"
                ? "low"
                : "neutral"
            }
          />
        )}
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
        {factors.weather && (
          <FactorBadge
            icon={CloudRain}
            label="Clima"
            value={`${factors.weather.label} (+${Math.round((factors.weather.multiplier - 1) * 100)}%)`}
            tone="high"
          />
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
    high: "bg-destructive/10 text-destructive border-destructive/30",
    low: "bg-success/10 text-success border-success/30",
    neutral: "bg-muted text-muted-foreground border-border",
  };
  const iconColor = {
    high: "text-destructive",
    low: "text-success",
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