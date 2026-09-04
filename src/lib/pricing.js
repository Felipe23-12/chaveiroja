// Motor de precificação e catálogo de serviços do ChaveiroJá

export const CAR_KEY_LABOR = 350;
export const CAR_KEY_COST_PER_KM = 1.5;

// Confecção de chave de carro (modo aplicativo):
// mão de obra = 0,8% do valor da tabela FIPE do veículo.
//  - Chave simples: mão de obra FIPE + custo fixo de R$ 120 (sem chave original)
//  - Chave canivete / com telecomando: mão de obra FIPE + valor da chave original
export const CAR_KEY_FIPE_LABOR_RATE = 0.008;
export const CAR_KEY_SIMPLE_FIXED = 120;

export const CAR_KEY_TYPES = [
  {
    id: "simples",
    label: "Chave simples",
    description: "0,8% da tabela FIPE + R$ 120 fixos",
    usesOriginalKey: false,
  },
  {
    id: "canivete",
    label: "Chave canivete",
    description: "0,8% da tabela FIPE + valor da chave original",
    usesOriginalKey: true,
  },
  {
    id: "telecomando",
    label: "Chave com telecomando",
    description: "0,8% da tabela FIPE + valor da chave original",
    usesOriginalKey: true,
  },
];

// Mão de obra e valor da chave conforme o tipo escolhido pelo cliente
export function carKeyComponents({ fipeValue = 0, keyValue = 0, keyType = "simples" }) {
  const fipe = Number(fipeValue) || 0;
  const fipeLabor = Math.round(fipe * CAR_KEY_FIPE_LABOR_RATE * 100) / 100;
  const type = CAR_KEY_TYPES.find((t) => t.id === keyType) || CAR_KEY_TYPES[0];
  if (type.usesOriginalKey) {
    return { fipeLabor, laborCost: fipeLabor, keyValue: Number(keyValue) || 0, type };
  }
  return {
    fipeLabor,
    laborCost: Math.round((fipeLabor + CAR_KEY_SIMPLE_FIXED) * 100) / 100,
    keyValue: 0,
    type,
  };
}

// Taxa de longa distância: quando o chaveiro está a mais de 20 km do cliente,
// cobra-se R$ 0,90 por km adicional (serviços que não têm locomoção embutida).
export const LONG_DISTANCE_THRESHOLD_KM = 20;
export const LONG_DISTANCE_KM_FEE = 0.90;

export function calculateLongDistanceFee(distanceKm) {
  const dist = Number(distanceKm) || 0;
  if (dist <= LONG_DISTANCE_THRESHOLD_KM) return 0;
  return Math.round(LONG_DISTANCE_KM_FEE * dist * 100) / 100;
}

// Limiar do valor "médio" usado no ajuste por urgência
export const TIER_MEDIUM = 0.6;

export const SERVICE_CATALOG = [
  {
    id: "abertura_residencial",
    label: "Abertura Residencial",
    description: "Abrir fechadura de casa ou apartamento",
    specialty: "Residencial",
    baseRange: [80, 250],
    options: [
      { id: "troca_miolo", label: "Troca de miolo + 2 chaves", price: 90 },
    ],
  },
  {
    id: "abertura_automotiva",
    label: "Abertura Automotiva",
    description: "Abrir veículo (carro ou moto)",
    specialty: "Automotivo",
    baseRange: [120, 350],
    needsVehicleInfo: true,
  },
  {
    id: "abertura_tetra",
    label: "Abertura Fechadura Tetra",
    description: "Fechadura tetra / tetrachave",
    specialty: "Residencial",
    baseRange: [100, 300],
    options: [
      { id: "troca_miolo", label: "Troca de miolo", price: 90 },
      { id: "troca_fechadura", label: "Troca de fechadura completa", price: "custom" },
    ],
  },
  {
    id: "abertura_eletronica",
    label: "Abertura Fechadura Eletrônica",
    description: "Fechadura eletrônica / digital",
    specialty: "Residencial",
    baseRange: [350, 450],
  },
  {
    id: "confeccao_chave_carro",
    label: "Confecção de Chave de Carro",
    description: "Cópia/original de chave do veículo (modo aplicativo)",
    specialty: "Automotivo",
    needsVehicleInfo: true,
    isCarKey: true,
    laborCost: CAR_KEY_LABOR,
    costPerKm: CAR_KEY_COST_PER_KM,
  },
  {
    id: "confeccao_chave_moto",
    label: "Confecção de Chave de Moto",
    description: "Chave simples ou presença para motos até 300cc (modo aplicativo)",
    specialty: "Automotivo",
    isMotoKey: true,
    baseRange: [200, 500],
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

// Feriados nacionais e estaduais (SP) fixos (dd-mm) + móveis de 2026.
// Em feriados e fins de semana (sábado/domingo), os valores são cobrados
// no topo da faixa definida para cada serviço (multiplicador 0.9).
const HOLIDAYS = new Set([
  // Feriados nacionais fixos
  "01-01", // Confraternização Universal (Ano Novo)
  "21-04", // Tiradentes
  "01-05", // Dia do Trabalho
  "07-09", // Independência do Brasil
  "12-10", // Nossa Senhora Aparecida
  "02-11", // Finados
  "15-11", // Proclamação da República
  "25-12", // Natal
  // Feriados estaduais/municipais de SP
  "25-01", // Aniversário de São Paulo
  "09-07", // Revolução Constitucionalista de 1932 (SP)
  // Feriados móveis de 2026
  "17-02", // Carnaval (terça-feira)
  "03-04", // Sexta-feira Santa (Paixão)
  "04-06", // Corpus Christi
]);

export function getTimeTier(date = new Date()) {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = domingo, 6 = sábado
  const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const isHoliday = HOLIDAYS.has(mmdd);
  const isWeekend = day === 0 || day === 6;

  if (isHoliday || isWeekend) {
    return { tier: "high", label: "Fim de semana / feriado (valores altos)", multiplier: 0.9 };
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
  urgency = "normal",
}) {
  if (!service) return null;

  const [low, high] = service.baseRange;
  const span = high - low;
  const time = getTimeTier();

  let factor = time.multiplier;
  // menos chaveiros disponíveis => preço maior
  if (locksmithsAvailable <= 2) factor = Math.min(factor + 0.15, 1);
  else if (locksmithsAvailable >= 8) factor = Math.max(factor - 0.1, 0.1);

  // Ajuste por urgência (modo aplicativo):
  // urgente => app oferta valores médios e altos; normal => médios e baixos
  if (urgency === "urgent") {
    factor = Math.max(factor, TIER_MEDIUM);
  } else {
    factor = Math.min(factor, TIER_MEDIUM);
  }

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
  fipeValue = 0,
  keyType = null,
  distanceKm = 0,
  laborCost = CAR_KEY_LABOR,
  costPerKm = CAR_KEY_COST_PER_KM,
  extraCost = 0,
  onlineProgrammingFee = 0,
}) {
  const comp = keyType ? carKeyComponents({ fipeValue, keyValue, keyType }) : null;
  const kv = comp ? comp.keyValue : Number(keyValue) || 0;
  const dist = Number(distanceKm) || 0;
  const extra = Number(extraCost) || 0;
  const labor = comp ? comp.laborCost : Number(laborCost) || 0;
  const perKm = Number(costPerKm) || 0;

  const onlineFee = Number(onlineProgrammingFee) || 0;
  const locomotion = Math.round(perKm * dist * 100) / 100;
  const total = Math.round((kv + labor + locomotion + extra + onlineFee) * 100) / 100;

  const breakdown = [
    { label: "Valor da chave original", value: kv },
    { label: "Mão de obra", value: labor },
  ];
  if (onlineFee > 0) {
    breakdown.push({ label: "Taxa de programação online (acesso da montadora)", value: onlineFee });
  }
  if (dist > 0) {
    breakdown.push({ label: `Locomoção (${dist.toFixed(1)} km × R$ ${perKm})`, value: locomotion });
  }
  if (extra > 0) {
    breakdown.push({ label: "Custos adicionais", value: extra });
  }

  return {
    keyValue: kv,
    laborCost: labor,
    locomotion,
    distanceKm: dist,
    extraCost: extra,
    onlineProgrammingFee: onlineFee,
    total,
    breakdown,
  };
}

// Calcula a comissão do app no modo "app" (15%)
export function calculateCommission(total, workMode) {
  if (workMode === "app") return Math.round(total * WORK_MODES.app.feeValue * 100) / 100;
  return 0;
}

// Taxa de cancelamento (modo aplicativo): após 5 minutos da confirmação do
// chaveiro, o cliente que cancelar paga 25% do valor total — 20% para o
// chaveiro e 5% para o aplicativo.
export const CANCELLATION_THRESHOLD_MINUTES = 5;
export const CANCELLATION_FEE_RATE = 0.25;
export const CANCELLATION_LOCKSMITH_SHARE = 0.20;
export const CANCELLATION_APP_SHARE = 0.05;

export function calculateCancellationFee(price) {
  const p = Number(price) || 0;
  const fee = Math.round(p * CANCELLATION_FEE_RATE * 100) / 100;
  const locksmithAmount = Math.round(p * CANCELLATION_LOCKSMITH_SHARE * 100) / 100;
  const appFee = Math.round(p * CANCELLATION_APP_SHARE * 100) / 100;
  return { fee, locksmithAmount, appFee };
}

// Calcula o repasse (valor líquido) devido ao chaveiro para um serviço,
// descontando a comissão do app conforme o modo de operação e a taxa de
// cancelamento quando houver.
//
//  - Serviço concluído no modo app: comissão de 15% para o app, 85% para o chaveiro.
//  - Serviço concluído no modo livre: sem comissão (repasse integral; a
//    mensalidade fixa é tratada à parte).
//  - Serviço cancelado com taxa (modo app): 20% do valor para o chaveiro e
//    5% para o app (a "comissão" do app sobre o cancelamento é de 5%).
export function calculateRepasse({
  price = 0,
  workMode,
  status,
  cancellation_locksmith_amount = 0,
  cancellation_app_fee = 0,
}) {
  const p = Number(price) || 0;
  const locksmithCancellation = Number(cancellation_locksmith_amount) || 0;
  const appCancellation = Number(cancellation_app_fee) || 0;

  // Cancelamento com taxa de cancelamento (modo app)
  if (status === "cancelled" && locksmithCancellation > 0) {
    return {
      gross: p,
      commission: appCancellation,
      commissionRate: CANCELLATION_APP_SHARE, // 5%
      cancellationFee: locksmithCancellation + appCancellation,
      locksmithAmount: locksmithCancellation, // 20%
      appAmount: appCancellation, // 5%
      type: "cancelamento",
    };
  }

  // Serviço concluído
  const rate = workMode === "app" ? WORK_MODES.app.feeValue : 0; // 15% app, 0% livre
  const commission = Math.round(p * rate * 100) / 100;
  const locksmithAmount = Math.round((p - commission) * 100) / 100;
  return {
    gross: p,
    commission,
    commissionRate: rate,
    cancellationFee: 0,
    locksmithAmount,
    appAmount: commission,
    type: "concluido",
  };
}