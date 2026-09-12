// Motor de precificação dinâmica (modo aplicativo) baseado em:
// 1. Oferta vs. demanda (chaveiros online vs. solicitações ativas)
// 2. Urgência (valores máximos)
// 3. Região de São Paulo (zonas mais distantes do centro = valores menores)
// 4. Nível socioeconômico do bairro (mais rico = cobrança média alta)
// 5. Taxa de distância excedente (R$ 0,90/km acima de 20 km)

import { haversineKm } from "./geo";
import {
  calculatePrice,
  calculateCarKeyPrice,
  calculateLongDistanceFee,
  LONG_DISTANCE_THRESHOLD_KM,
  LONG_DISTANCE_KM_FEE,
  BROKEN_KEY_FEE,
  isOpeningService,
} from "./pricing";
import {
  SP_CENTER,
  REGION_MULTIPLIERS,
  NEIGHBORHOOD_TIERS,
  ABC_CITIES,
} from "@/data/spRegions";

// --- Multiplicador de oferta/demanda ---
// supply = chaveiros online no modo app
// demand = solicitações ativas (searching + ringing)
// ratio = demand / supply
//   ratio alto (muita demanda, pouca oferta) → preços maiores
//   ratio baixo (muita oferta, pouca demanda) → preços menores
export function calculateSupplyDemandMultiplier(supply = 0, demand = 0) {
  if (supply === 0) {
    return { multiplier: 1.25, label: "Sem chaveiros online", ratio: Infinity };
  }
  const ratio = demand / supply;

  if (ratio >= 2) return { multiplier: 1.25, label: "Demanda muito alta", ratio };
  if (ratio >= 1.5) return { multiplier: 1.15, label: "Demanda alta", ratio };
  if (ratio >= 1) return { multiplier: 1.05, label: "Demanda moderada", ratio };
  if (ratio >= 0.5) return { multiplier: 0.95, label: "Equilibrado", ratio };
  if (ratio >= 0.25) return { multiplier: 0.88, label: "Baixa demanda", ratio };
  return { multiplier: 0.82, label: "Muita oferta", ratio };
}

export const URGENCY_MULTIPLIER = 1.3;

// Limites do multiplicador combinado para evitar preços extremos
const MIN_COMBINED = 0.70;
const MAX_COMBINED = 1.60;

// --- Detecção de região por coordenadas + endereço ---
export function determineRegion(lat, lng, address = "") {
  const addr = (address || "").toLowerCase();

  // Detecção por nome de cidade do ABC no endereço
  if (ABC_CITIES.some((c) => addr.includes(c))) {
    return { id: "abc", ...REGION_MULTIPLIERS.abc };
  }

  if (lat == null || lng == null) {
    return { id: "other", ...REGION_MULTIPLIERS.other };
  }

  const dLat = lat - SP_CENTER.lat;
  const dLng = lng - SP_CENTER.lng;
  const distKm = haversineKm(SP_CENTER, { lat, lng });

  // Centro expandido: até 5 km da referência
  if (distKm <= 5) {
    return { id: "central", ...REGION_MULTIPLIERS.central };
  }

  // ABC por coordenadas: sul e leste de SP
  if (lat < -23.62 && lng > -46.62 && lng < -46.40) {
    return { id: "abc", ...REGION_MULTIPLIERS.abc };
  }

  // Direção dominante a partir do centro
  const absDLat = Math.abs(dLat);
  const absDLng = Math.abs(dLng);

  if (absDLat > absDLng) {
    if (dLat > 0) return { id: "norte", ...REGION_MULTIPLIERS.norte };
    return { id: "sul", ...REGION_MULTIPLIERS.sul };
  } else {
    if (dLng > 0) return { id: "leste", ...REGION_MULTIPLIERS.leste };
    return { id: "oeste", ...REGION_MULTIPLIERS.oeste };
  }
}

// --- Detecção de nível socioeconômico do bairro ---
export function detectNeighborhoodTier(address = "") {
  if (!address) return { tier: "unknown", label: "Bairro não identificado", multiplier: 1.0 };

  const addr = address.toLowerCase();

  for (const [tier, data] of Object.entries(NEIGHBORHOOD_TIERS)) {
    for (const neighborhood of data.neighborhoods) {
      if (addr.includes(neighborhood)) {
        return { tier, label: data.label, multiplier: data.multiplier };
      }
    }
  }

  return { tier: "unknown", label: "Bairro não identificado", multiplier: 1.0 };
}

// --- Cálculo dinâmico de preço (modo aplicativo) ---
export function calculateDynamicPrice({
  service,
  selectedOptions = [],
  customAddons = {},
  vehicleInfo = null,
  locks = [],
  onlineLocksmiths = 0,
  activeRequests = 0,
  urgency = "normal",
  customerLat,
  customerLng,
  address = "",
  nearestDistanceKm = null,
  keyValue = null,
  fipeValue = null,
  carKeyType = null,
  hasCodedKey = false,
  onlineProgrammingFee = 0,
  weather = null,
  brokenKeyInLock = false,
}) {
  if (!service) return null;

  // 1. Preço base do motor existente (já considera horário, complexidade, adicionais)
  // Passa locksmithsAvailable neutro (5) para evitar dupla contagem de oferta —
  // a oferta/demanda é tratada exclusivamente pelo multiplicador dinâmico abaixo.
  const baseResult = service.isCarKey
    ? calculateCarKeyPrice({
        keyValue: keyValue || 0,
        fipeValue: fipeValue || 0,
        keyType: carKeyType,
        year: vehicleInfo?.year,
        hasCodedKey,
        distanceKm: 0,
        extraCost: 0,
        onlineProgrammingFee,
      })
    : calculatePrice({
        service,
        selectedOptions,
        customAddons,
        vehicleInfo,
        locks,
        locksmithsAvailable: 5,
        urgency,
      });

  if (!baseResult) return null;

  // 2. Fatores dinâmicos
  const supplyDemand = calculateSupplyDemandMultiplier(onlineLocksmiths, activeRequests);
  const urgencyMult = urgency === "urgent" ? URGENCY_MULTIPLIER : 1.0;
  const region = determineRegion(customerLat, customerLng, address);
  const neighborhood = detectNeighborhoodTier(address);

  // 3. Multiplicador combinado (com limites)
  let combinedMultiplier =
    supplyDemand.multiplier * urgencyMult * region.multiplier * neighborhood.multiplier;
  combinedMultiplier = Math.min(Math.max(combinedMultiplier, MIN_COMBINED), MAX_COMBINED);
  // Chuva é aplicada por fora do limite: garoa acrescenta pouco e tempestade
  // acrescenta o máximo de 70%.
  const weatherMult = weather?.multiplier || 1.0;
  combinedMultiplier = combinedMultiplier * weatherMult;
  combinedMultiplier = Math.round(combinedMultiplier * 100) / 100;

  // 4. Taxa de distância excedente (acima de 20 km)
  const distanceFee =
    nearestDistanceKm != null ? calculateLongDistanceFee(nearestDistanceKm) : 0;
  const distanceOverThreshold =
    nearestDistanceKm != null && nearestDistanceKm > LONG_DISTANCE_THRESHOLD_KM;

  // 5. Constrói o breakdown com ajustes sequenciais
  const breakdown = [];
  let current;
  let addonsTotal;

  if (service.isCarKey) {
    // Chave de carro: multiplica apenas a mão de obra; valor da chave é fixo
    const adjustedLabor = Math.round(baseResult.laborCost * combinedMultiplier * 100) / 100;
    const onlineFee = baseResult.onlineProgrammingFee || 0;
    current = baseResult.keyValue + adjustedLabor + onlineFee;
    addonsTotal = 0;

    if (baseResult.keyValue > 0) {
      breakdown.push({ label: "Valor da chave", value: baseResult.keyValue });
    }
    breakdown.push({
      label: `Mão de obra (ajuste dinâmico ×${combinedMultiplier})`,
      value: adjustedLabor,
    });
    if (onlineFee > 0) {
      breakdown.push({ label: "Taxa de programação online (acesso da montadora)", value: onlineFee });
    }
  } else {
    // Serviços normais: multiplica o base; adicionais são fixos
    current = Math.round(baseResult.base * combinedMultiplier * 100) / 100;
    addonsTotal = baseResult.addons || 0;

    breakdown.push({ label: `${service.label} (base)`, value: baseResult.base });

    // Detalha os fatores dinâmicos como ajustes sequenciais
    const pushAdjustment = (label, prev, mult) => {
      const next = Math.round(prev * mult * 100) / 100;
      const delta = Math.round((next - prev) * 100) / 100;
      breakdown.push({ label, value: delta, isAdjustment: true });
      return next;
    };

    current = pushAdjustment(
      `Oferta/demanda (${supplyDemand.label})`,
      current,
      supplyDemand.multiplier
    );

    if (urgency === "urgent") {
      current = pushAdjustment("Urgência (valor máximo)", current, urgencyMult);
    }

    current = pushAdjustment(`Região (${region.label})`, current, region.multiplier);
    current = pushAdjustment(`Bairro (${neighborhood.label})`, current, neighborhood.multiplier);

    if (weatherMult > 1) {
      current = pushAdjustment(
        `Clima (${weather.label} · +${Math.round((weatherMult - 1) * 100)}%)`,
        current,
        weatherMult
      );
    }

    // Adicionais (do breakdown original, excluindo o primeiro item que é a base)
    (baseResult.breakdown || []).slice(1).forEach((item) => {
      breakdown.push(item);
    });
  }

  // Taxa de distância
  if (distanceFee > 0) {
    const extraKm = Math.max(0, nearestDistanceKm - LONG_DISTANCE_THRESHOLD_KM).toFixed(1);
    breakdown.push({
      label: `Taxa de distância (${extraKm} km excedente × R$ ${LONG_DISTANCE_KM_FEE})`,
      value: distanceFee,
    });
  }

  // Abertura automotiva: veículos a partir de 2020 têm acréscimo de 25%
  const vehicleYear = parseInt(vehicleInfo?.year, 10);
  if (service.id === "abertura_automotiva" && vehicleYear >= 2020) {
    const before = current;
    current = Math.round(current * 1.25 * 100) / 100;
    breakdown.push({
      label: "Veículo 2020 ou mais novo (+25%)",
      value: Math.round((current - before) * 100) / 100,
      isAdjustment: true,
    });
  }

  // Abertura automotiva: cada nível acima do simples acrescenta exatamente R$ 25 ao total.
  const complexitySteps = { simples: 0, media: 1, alta: 2 };
  const automotiveComplexityFee = service.id === "abertura_automotiva"
    ? (complexitySteps[vehicleInfo?.complexity] || 0) * 25
    : 0;
  if (automotiveComplexityFee > 0) {
    breakdown.push({
      label: `${vehicleInfo?.complexity === "alta" ? "Alta" : "Média"} complexidade da abertura`,
      value: automotiveComplexityFee,
    });
  }

  // Chave quebrada dentro da fechadura (serviços de abertura): taxa fixa
  const brokenKeyFee = isOpeningService(service) && brokenKeyInLock ? BROKEN_KEY_FEE : 0;
  if (brokenKeyFee > 0) {
    breakdown.push({ label: "Adicional de condição da abertura", value: brokenKeyFee });
  }

  // Piso nacional das aberturas residencial e automotiva: R$ 50
  const MIN_OPENING_TOTAL = 50;
  const hasOpeningFloor = ["abertura_residencial", "abertura_automotiva"].includes(service.id);
  const rawTotal = Math.round((current + addonsTotal + distanceFee) * 100) / 100;
  const total = (hasOpeningFloor ? Math.max(rawTotal, MIN_OPENING_TOTAL) : rawTotal) + automotiveComplexityFee + brokenKeyFee;

  return {
    base: service.isCarKey
      ? baseResult.keyValue +
        Math.round(baseResult.laborCost * combinedMultiplier * 100) / 100 +
        (baseResult.onlineProgrammingFee || 0)
      : current,
    addons: addonsTotal,
    distanceFee,
    brokenKeyFee,
    automotiveComplexityFee,
    total: Math.round(total * 100) / 100,
    breakdown,
    timeTier: baseResult.timeTier,
    factors: {
      supplyDemand,
      urgency: urgency === "urgent" ? { multiplier: urgencyMult, label: "Urgente" } : null,
      region,
      neighborhood,
      weather: weatherMult > 1 ? weather : null,
      combinedMultiplier,
      distanceOverThreshold,
      onlineLocksmiths,
      activeRequests,
      timeTier: baseResult.timeTier,
    },
  };
}