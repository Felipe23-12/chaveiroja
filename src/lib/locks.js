// Fechaduras do atendimento: o cliente informa quantas portas precisa abrir,
// o modelo de cada fechadura e em quais delas quer trocar o miolo.
//
// Regra de preço: a abertura da PRIMEIRA fechadura já está no valor base do
// serviço. Cada fechadura adicional cobra o valor de abertura do seu modelo, e
// cada troca de miolo cobra o valor do miolo do respectivo modelo.

export const LOCK_MODELS = [
  { id: "simples", label: "Fechadura simples", openPrice: 70, mioloPrice: 90 },
  { id: "tetra", label: "Fechadura tetra (trava de segurança)", openPrice: 120, mioloPrice: 180 },
  { id: "eletronica", label: "Fechadura eletrônica / digital", openPrice: 250, mioloPrice: 300 },
  { id: "auxiliar", label: "Fechadura auxiliar / reforço", openPrice: 60, mioloPrice: 80 },
  { id: "outro", label: "Outro modelo (chaveiro avalia no local)", openPrice: 0, mioloPrice: 0, custom: true },
];

export const getLockModel = (id) => LOCK_MODELS.find((m) => m.id === id) || LOCK_MODELS[0];

let seq = 0;
export function createLock(model = "simples") {
  seq += 1;
  return { uid: `lock-${Date.now()}-${seq}`, model, miolo: false };
}

// Valores adicionais das fechaduras (fora do valor base do serviço)
export function calculateLocksExtra(locks = []) {
  const breakdown = [];
  let total = 0;
  let hasCustom = false;

  locks.forEach((lock, index) => {
    const model = getLockModel(lock.model);
    if (model.custom) hasCustom = true;
    if (index > 0 && model.openPrice > 0) {
      total += model.openPrice;
      breakdown.push({ label: `Abertura adicional — ${model.label}`, value: model.openPrice });
    }
    if (lock.miolo && model.mioloPrice > 0) {
      total += model.mioloPrice;
      breakdown.push({ label: `Troca de miolo — ${model.label}`, value: model.mioloPrice });
    }
  });

  return { total: Math.round(total * 100) / 100, breakdown, hasCustom };
}

// Resumo em texto enviado ao chaveiro junto com a solicitação
export function locksSummary(locks = []) {
  if (locks.length === 0) return "";
  const parts = locks.map((l) => {
    const model = getLockModel(l.model);
    return `${model.label}${l.miolo ? " (abrir + trocar miolo)" : " (abrir)"}`;
  });
  return `${locks.length} fechadura${locks.length > 1 ? "s" : ""}: ${parts.join("; ")}`;
}