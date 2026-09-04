// Regras de programação de chave de carro que exigem acesso ONLINE pago
// (compra de token/acesso junto à montadora) ou que só podem ser feitas
// na concessionária.
//
//  - GM/Chevrolet com imobilizador 4A e modelos novos da VW: adicional fixo
//    de R$ 250 (taxa paga pelo chaveiro para comprar o acesso online).
//  - Alguns modelos da VW: programação exclusiva de concessionária — o
//    serviço não é atendido pelo aplicativo.

export const ONLINE_PROGRAMMING_FEE = 250;

// VW que só a concessionária programa
const VW_DEALER_ONLY = ["amarok", "touareg", "tiguan", "taos", "jetta gli", "golf gti"];

// VW novos com programação online paga (a partir da geração MQB / 2018)
const VW_ONLINE_MODELS = ["polo", "virtus", "t-cross", "tcross", "nivus", "jetta", "golf", "saveiro", "gol", "voyage"];
const VW_ONLINE_FROM_YEAR = 2018;

// GM/Chevrolet com imobilizador 4A (programação online paga)
const GM_ONLINE_MODELS = ["onix", "onix plus", "tracker", "spin", "s10", "cruze", "montana", "trailblazer", "equinox"];
const GM_ONLINE_FROM_YEAR = 2020;

const isVW = (m) =>
  /\b(vw|volkswagen)\b/.test(m) ||
  ["polo", "virtus", "t-cross", "tcross", "nivus", "jetta", "golf", "saveiro", "amarok", "touareg", "tiguan", "taos", "voyage", "gol", "fox", "up"].some((k) =>
    m.includes(k)
  );

const isGM = (m) =>
  /\b(gm|chevrolet)\b/.test(m) ||
  ["onix", "tracker", "spin", "cruze", "montana", "s10", "trailblazer", "equinox", "prisma", "cobalt"].some((k) => m.includes(k));

/**
 * Detecta a necessidade de programação online paga ou exclusiva de concessionária.
 * @returns {{ onlineFee: number, dealerOnly: boolean, reason: string }}
 */
export function detectCarKeyProgramming(model, year) {
  const m = (model || "").toLowerCase().trim();
  const y = Number(String(year ?? "").trim()) || 0;
  if (!m) return { onlineFee: 0, dealerOnly: false, reason: "" };

  const vw = isVW(m);
  const gm = isGM(m);

  if (vw && VW_DEALER_ONLY.some((k) => m.includes(k))) {
    return {
      onlineFee: 0,
      dealerOnly: true,
      reason:
        "Este modelo Volkswagen só pode ter a chave programada na concessionária autorizada — não é possível atender pelo aplicativo.",
    };
  }

  // Menção explícita ao sistema 4A da GM
  if (/\b4a\b/.test(m) && (gm || /\b(gm|chevrolet)\b/.test(m))) {
    return {
      onlineFee: ONLINE_PROGRAMMING_FEE,
      dealerOnly: false,
      reason: "Chevrolet com imobilizador 4A: exige acesso online pago à montadora (adicional de R$ 250).",
    };
  }

  if (gm && y >= GM_ONLINE_FROM_YEAR && GM_ONLINE_MODELS.some((k) => m.includes(k))) {
    return {
      onlineFee: ONLINE_PROGRAMMING_FEE,
      dealerOnly: false,
      reason: "Chevrolet com imobilizador 4A: exige acesso online pago à montadora (adicional de R$ 250).",
    };
  }

  if (vw && y >= VW_ONLINE_FROM_YEAR && VW_ONLINE_MODELS.some((k) => m.includes(k))) {
    return {
      onlineFee: ONLINE_PROGRAMMING_FEE,
      dealerOnly: false,
      reason: "Volkswagen de nova geração: programação exige acesso online pago à montadora (adicional de R$ 250).",
    };
  }

  return { onlineFee: 0, dealerOnly: false, reason: "" };
}