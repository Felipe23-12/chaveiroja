// Previsão do tempo (Open-Meteo — sem chave de API) usada na precificação.
// Chuva encarece o atendimento: quanto mais forte a chuva, maior o acréscimo,
// até o limite de 70% em caso de tempestade.

export const MAX_WEATHER_SURGE = 1.70;

// Códigos de tempestade (WMO): 95, 96, 99
const STORM_CODES = [95, 96, 99];

/**
 * Converte intensidade de chuva (mm/h) e código do tempo em multiplicador.
 * garoa → menor acréscimo · tempestade → acréscimo máximo (70%)
 */
export function rainSurge(precipitationMm = 0, weatherCode = 0) {
  if (STORM_CODES.includes(weatherCode)) {
    return { multiplier: MAX_WEATHER_SURGE, label: "Tempestade", level: "storm" };
  }
  if (precipitationMm >= 7.6) {
    return { multiplier: 1.55, label: "Chuva forte", level: "heavy" };
  }
  if (precipitationMm >= 2.5) {
    return { multiplier: 1.4, label: "Chuva moderada", level: "moderate" };
  }
  if (precipitationMm >= 0.5) {
    return { multiplier: 1.25, label: "Chuva leve", level: "light" };
  }
  if (precipitationMm > 0) {
    return { multiplier: 1.15, label: "Garoa", level: "drizzle" };
  }
  return { multiplier: 1.0, label: "Sem chuva", level: "none" };
}

/**
 * Busca a condição atual no local do cliente e devolve o multiplicador de chuva.
 * Em caso de falha, devolve multiplicador neutro (nunca bloqueia o pedido).
 */
export async function fetchWeatherSurge(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,weather_code`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const precipitation = data?.current?.precipitation ?? 0;
    const code = data?.current?.weather_code ?? 0;
    return { ...rainSurge(precipitation, code), precipitation };
  } catch (e) {
    return null;
  }
}