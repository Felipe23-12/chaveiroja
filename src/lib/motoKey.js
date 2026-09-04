// Regras de precificação da confecção de chave de MOTO (modo aplicativo).
//
// Critérios:
//  - Motos comuns (chave simples) até 300 cilindradas:
//      Honda/Yamaha: R$ 200 a R$ 500 · modelos a partir de 2022: R$ 300 a R$ 500
//  - Scooters premium (PCX, SH, ADV, NMAX, XMAX):
//      chave simples até 2022: R$ 500 a R$ 700
//      chave presença COM senha da moto: R$ 500 a R$ 700 (qualquer ano)
//      chave presença SEM senha até 2023: R$ 700 a R$ 950
//      chave presença SEM senha acima de 2023: R$ 950 a R$ 1.300
//  - Acima de 300 cilindradas (chave simples): apenas chaveiros no MODO LIVRE.
//
// O valor final dentro da faixa é definido pelo motor dinâmico (região,
// horário, feriado, oferta/demanda e urgência).

import { validateMotoYear } from "@/lib/fipeValidation";

export const MOTO_BRANDS = [
  { id: "honda", label: "Honda" },
  { id: "yamaha", label: "Yamaha" },
];

export const MOTO_MODELS = {
  honda: [
    { id: "pop110", label: "Pop 110i", cc: 110, premium: false },
    { id: "biz125", label: "Biz 125", cc: 125, premium: false },
    { id: "cg160", label: "CG 160", cc: 160, premium: false },
    { id: "bros160", label: "NXR 160 Bros", cc: 160, premium: false },
    { id: "cb300", label: "CB 300F Twister", cc: 300, premium: false },
    { id: "xre300", label: "XRE 300", cc: 300, premium: false },
    { id: "pcx", label: "PCX 160", cc: 160, premium: true },
    { id: "sh", label: "SH 150 / SH 300", cc: 300, premium: true },
    { id: "adv", label: "ADV 350", cc: 350, premium: true },
    { id: "cb500", label: "CB 500 (acima de 300cc)", cc: 500, premium: false },
    { id: "xre1000", label: "XRE 190/750/1000 (acima de 300cc)", cc: 750, premium: false },
  ],
  yamaha: [
    { id: "neo125", label: "Neo 125", cc: 125, premium: false },
    { id: "factor150", label: "Factor 150", cc: 150, premium: false },
    { id: "xtz150", label: "Crosser / XTZ 150", cc: 150, premium: false },
    { id: "fazer250", label: "Fazer 250", cc: 250, premium: false },
    { id: "lander250", label: "Lander 250", cc: 250, premium: false },
    { id: "nmax", label: "NMAX 160", cc: 160, premium: true },
    { id: "xmax", label: "XMAX 250", cc: 250, premium: true },
    { id: "mt03", label: "MT-03 / R3 (acima de 300cc)", cc: 320, premium: false },
    { id: "mt07", label: "MT-07 (acima de 300cc)", cc: 690, premium: false },
  ],
};

export const MOTO_KEY_TYPES = [
  { id: "simples", label: "Chave simples", description: "Chave codificada tradicional" },
  { id: "presenca", label: "Chave presença (Smart Key)", description: "Somente PCX, SH, ADV, NMAX e XMAX" },
];

export function getMotoModel(brandId, modelId) {
  return (MOTO_MODELS[brandId] || []).find((m) => m.id === modelId) || null;
}

/**
 * Devolve a faixa de valores da confecção da chave da moto ou o bloqueio
 * quando o serviço só pode ser feito por chaveiro no modo livre.
 * @returns {{ range: [number, number]|null, blocked: boolean, reason: string }}
 */
export function getMotoKeyRange({ brandId, modelId, year, keyType, hasPassword = false }) {
  const model = getMotoModel(brandId, modelId);
  if (!model || !year || !keyType) {
    return { range: null, blocked: false, reason: "Selecione marca, modelo, ano e tipo de chave." };
  }
  const checkedYear = validateMotoYear(year);
  if (!checkedYear.valid) {
    return { range: null, blocked: true, reason: checkedYear.error };
  }
  const y = checkedYear.year;
  if (keyType === "presenca" && hasPassword == null) {
    return { range: null, blocked: false, reason: "Informe se a moto possui senha de chave presença." };
  }

  // Chave presença apenas nos scooters compatíveis
  if (keyType === "presenca" && !model.premium) {
    return { range: null, blocked: true, reason: "Este modelo não utiliza chave presença. Selecione chave simples." };
  }

  if (model.premium) {
    if (keyType === "simples") {
      if (y <= 2022) return { range: [500, 700], blocked: false, reason: "" };
      return {
        range: null,
        blocked: true,
        reason: "Modelos acima de 2022 utilizam chave presença. Selecione chave presença.",
      };
    }
    // Chave presença
    if (hasPassword) return { range: [500, 700], blocked: false, reason: "" };
    if (y <= 2023) return { range: [700, 950], blocked: false, reason: "" };
    return { range: [950, 1300], blocked: false, reason: "" };
  }

  // Motos comuns — somente até 300 cilindradas no modo aplicativo
  if (model.cc > 300) {
    return {
      range: null,
      blocked: true,
      reason:
        "Motos acima de 300 cilindradas não são atendidas no modo aplicativo. Procure um chaveiro no Modo Livre pelo mapa.",
    };
  }

  if (y >= 2022) return { range: [300, 500], blocked: false, reason: "" };
  return { range: [200, 500], blocked: false, reason: "" };
}