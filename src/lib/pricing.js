// Motor de precificação e catálogo de serviços do ChaveiroJá

export const CAR_KEY_LABOR = 350;
export const CAR_KEY_COST_PER_KM = 1.5;

export const SERVICE_CATALOG = [
  {
    id: "abertura_residencial",
    label: "Abertura Residencial",
    description: "Abrir fechadura de casa ou apartamento",
    baseRange: [80, 250],
    options: [
      { id: "troca_miolo", label: "Troca de miolo + 2 chaves", price: 90 },
    ],
  },
  {
    id: "abertura_automotiva",
    label: "Abertura Automotiva",
    description: "Abrir veículo (carro ou moto)",
    baseRange: [100, 1000],
    needsVehicleInfo: true,
  },
  {
    id: "abertura_tetra",
    label: "Abertura Fechadura Tetra",
    description: "Fechadura tetra / tetrachave",
    baseRange: [140, 300],
    options: [
      { id: "troca_miolo", label: "Troca de miolo", price: 90 },
      { id: "troca_fechadura", label: "Troca de fechadura completa", price: "custom" },
    ],
  },
  {
    id: "abertura_eletronica",
    label: "Abertura Fechadura Eletrônica",
    description: "Fechadura eletrônica / digital",
    baseRange: [350, 500],
  },
  {
    id: "confeccao_chave_carro",
    label: "Confecção de Chave de Carro",
    description: "Cópia/original de chave do veículo (modo aplicativo)",
    needsVehicleInfo: true,
    isCarKey: true,
    laborCost: CAR_KEY_LABOR,
    costPerKm: CAR_KEY_COST_PER_KM,
  },
];

export const WORK_MODES = {
  livre: {
    label: "Modo Livre",
    description: "Você define o valor dos seus serviços",
    fee: "R$ 50,00 por mês (assinatura fixa)",
    feeType: "monthly",
    feeValue: 50,
  },
  app: {
    label: "Modo Aplicativo",
    description: "O app define o valor ofertado ao cliente",
    fee: "15% de cada serviço concluído",
    feeType: "commission",
    feeValue: 0.15,
  },
};

// Lista simples de feriados nacionais (dd-mm). Pode ser ampliada.
const HOLIDAYS = new Set([
  "01-01", "21-04", "01-05", "07-09", "12-10", "02-11", "15-11", "25-12",
]);

export function getTimeTier(date = new Date()) {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = domingo, 6 = sábado
  const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const isHoliday = HOLIDAYS.has(mmdd);
  const isWeekend = day === 0 || day === 6;

  if (isHoliday || isWeekend) {
    return { tier: "high", label: "Fim de semana / feriado", multiplier: 0.85 };
  }
  if (hour >= 8 && hour < 17) {
    return { tier: "low", label: "Horário comercial (08h-17h)", multiplier: 0.2 };
  }
  return { tier: "medium", label: "Fora do horário comercial", multiplier: 0.6 };
}

const COMPLEXITY_FACTOR = { simples: 0, media: 0.3, alta: 0.6 };

export function calculatePrice({
  service,
  selectedOptions = [],
  customAddons = {},
  vehicleInfo = null,
  locksmithsAvailable = 5,
}) {
  if (!service) return null;

  const [low, high] = service.baseRange;
  const span = high - low;
  const time = getTimeTier();

  let factor = time.multiplier;
  // menos chaveiros disponíveis => preço maior
  if (locksmithsAvailable <= 2) factor = Math.min(factor + 0.15, 1);
  else if (locksmithsAvailable >= 8) factor = Math.max(factor - 0.1, 0.1);

  let base = Math.round(low + span * factor);
  const breakdown = [{ label: `${service.label} (${time.label})`, value: base }];

  // Fatores automotivos: complexidade + ano
  if (service.needsVehicleInfo && vehicleInfo) {
    const cFactor = COMPLEXITY_FACTOR[vehicleInfo.complexity] || 0;
    const yearAdjust = vehicleInfo.year && Number(vehicleInfo.year) >= 2020 ? 0.15 : 0;
    const extra = Math.round(span * (cFactor + yearAdjust));
    if (extra > 0) {
      base += extra;
      breakdown.push({ label: "Complexidade / ano do veículo", value: extra });
    }
  }

  // Adicionais (miolo, fechadura completa, etc.)
  let addonsTotal = 0;
  selectedOptions.forEach((optId) => {
    const opt = service.options?.find((o) => o.id === optId);
    if (!opt) return;
    let val;
    if (opt.price === "custom") {
      val = Number(customAddons[optId]) || 0;
    } else {
      val = opt.price;
    }
    if (val > 0) {
      addonsTotal += val;
      breakdown.push({ label: opt.label, value: val });
    }
  });

  const total = base + addonsTotal;
  return { base, addons: addonsTotal, total, breakdown, timeTier: time };
}

// Cálculo da confecção de chave de carro (modo aplicativo):
// valor da chave original + mão de obra fixa + locomoção (R$ por km) + adicionais
export function calculateCarKeyPrice({
  keyValue = 0,
  distanceKm = 0,
  laborCost = CAR_KEY_LABOR,
  costPerKm = CAR_KEY_COST_PER_KM,
  extraCost = 0,
}) {
  const kv = Number(keyValue) || 0;
  const dist = Number(distanceKm) || 0;
  const extra = Number(extraCost) || 0;
  const labor = Number(laborCost) || 0;
  const perKm = Number(costPerKm) || 0;

  const locomotion = Math.round(perKm * dist * 100) / 100;
  const total = Math.round((kv + labor + locomotion + extra) * 100) / 100;

  const breakdown = [
    { label: "Valor da chave original", value: kv },
    { label: "Mão de obra", value: labor },
  ];
  if (dist > 0) {
    breakdown.push({ label: `Locomoção (${dist.toFixed(1)} km × R$ ${perKm})`, value: locomotion });
  }
  if (extra > 0) {
    breakdown.push({ label: "Custos adicionais", value: extra });
  }

  return { keyValue: kv, laborCost: labor, locomotion, distanceKm: dist, extraCost: extra, total, breakdown };
}

// Calcula a comissão do app no modo "app" (15%)
export function calculateCommission(total, workMode) {
  if (workMode === "app") return Math.round(total * WORK_MODES.app.feeValue * 100) / 100;
  return 0;
}