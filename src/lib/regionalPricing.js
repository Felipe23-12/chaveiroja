// Faixa de preços por estado/capital (dados de referência PrecoReferencia).
//
// Regra de proximidade: quanto mais perto da capital do estado, mais a faixa
// se aproxima dos valores médios/máximos observados na capital; quanto mais
// longe, mais a faixa se aproxima dos valores mínimos/médios.
//
// As demais regras (oferta e demanda, dia/horário, chuva, urgência, bairro)
// continuam sendo aplicadas depois, pelo motor de precificação dinâmica.

import { haversineKm } from "./geo";
import { BRAZIL_CAPITALS, findNearestCapital } from "@/data/brazilCapitals";

// Distância até a capital em que a proximidade é considerada total / nula
export const NEAR_CAPITAL_KM = 20;
export const FAR_CAPITAL_KM = 200;

// Serviço do catálogo → código de serviço da tabela de referência
export const SERVICE_REFERENCE_CODE = {
  abertura_residencial: "residencial_comum",
  abertura_tetra: "trava_tetra",
  abertura_eletronica: "fechadura_eletronica",
  abertura_automotiva: "abertura_automotiva",
};

export function nearestCapital(lat, lng) {
  return findNearestCapital(lat, lng, haversineKm);
}

// 1 = na capital (ou até 20 km); 0 = a 200 km ou mais da capital
export function capitalProximity(distanceKm) {
  const d = Number(distanceKm);
  if (!isFinite(d)) return 0;
  if (d <= NEAR_CAPITAL_KM) return 1;
  if (d >= FAR_CAPITAL_KM) return 0;
  return (FAR_CAPITAL_KM - d) / (FAR_CAPITAL_KM - NEAR_CAPITAL_KM);
}

/**
 * Constrói a faixa base do serviço a partir do registro de referência da
 * capital mais próxima, deslocada pela distância do cliente até essa capital.
 */
// Valor mínimo nacional de abertura (residencial e automotiva) em qualquer
// capital ou cidade do Brasil — as demais regras continuam sendo aplicadas.
export const MIN_OPENING_PRICE_BRL = 50;
export const MIN_OPENING_CODES = ["residencial_comum", "abertura_automotiva"];

export function buildRegionalRange(reference, distanceKm) {
  if (!reference) return null;
  const floor = MIN_OPENING_CODES.includes(reference.servico_codigo) ? MIN_OPENING_PRICE_BRL : 0;
  const min = Math.max(Number(reference.preco_minimo_brl) || 0, floor);
  const avg = Number(reference.preco_medio_brl) || 0;
  const max = Number(reference.preco_maximo_brl) || avg;
  if (!avg) return null;

  const p = capitalProximity(distanceKm);
  const low = Math.max(Math.round(min + (avg - min) * p * 0.5), floor);
  const high = Math.round(avg + (max - avg) * p);

  return {
    range: [low, Math.max(high, low + 1)],
    proximity: p,
    reference,
    distanceKm: Number(distanceKm) || 0,
    label:
      p >= 0.85
        ? `Valores de ${reference.capital} (${reference.uf})`
        : p <= 0.15
        ? `Interior de ${reference.uf} — longe de ${reference.capital}`
        : `Região metropolitana de ${reference.capital} (${reference.uf})`,
  };
}

export { BRAZIL_CAPITALS };