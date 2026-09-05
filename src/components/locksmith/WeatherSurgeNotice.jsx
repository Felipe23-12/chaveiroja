import React from "react";
import { CloudRain, CloudDrizzle, CloudLightning } from "lucide-react";

// Aviso de acréscimo por chuva no valor do atendimento.
export default function WeatherSurgeNotice({ weather }) {
  if (!weather || weather.multiplier <= 1) return null;

  const Icon =
    weather.level === "storm"
      ? CloudLightning
      : weather.level === "drizzle"
      ? CloudDrizzle
      : CloudRain;
  const percent = Math.round((weather.multiplier - 1) * 100);

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-50 border border-sky-300 text-sky-900">
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-sm">
        <strong>{weather.label} no local do atendimento.</strong> Por conta das
        condições do tempo, o valor do serviço está{" "}
        <strong>{percent}% maior</strong>
        {weather.level === "storm" && " (acréscimo máximo)"}.
      </p>
    </div>
  );
}