import { useEffect, useState } from "react";
import { fetchWeatherSurge } from "@/lib/weather";

/**
 * Consulta a previsão do tempo no local do cliente e devolve o multiplicador
 * de chuva usado na precificação dinâmica.
 */
export default function useWeatherSurge(lat, lng) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (lat == null || lng == null) return;
    let cancelled = false;
    fetchWeatherSurge(lat, lng).then((w) => {
      if (!cancelled) setWeather(w);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return weather;
}