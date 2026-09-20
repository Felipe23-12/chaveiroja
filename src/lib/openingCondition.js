export const OPENING_CONDITION_FEE = 25;
export const LOCKSMITH_CORRECTION_MARKER = "Ajuste no local confirmado pelo chaveiro";

export const isOpeningRequest = (request) =>
  Boolean(request?.service_type?.startsWith("Abertura"));

export const hasLocksmithConditionCorrection = (request) =>
  Boolean(request?.description?.includes(LOCKSMITH_CORRECTION_MARKER));

export const hasOpeningConditionFee = (request) =>
  isOpeningRequest(request) && Boolean(
    request?.description?.includes("Cliente informou: fechadura com problema") ||
    request?.description?.includes("Chave quebrada dentro da fechadura") ||
    request?.description?.includes("Adicional único de R$ 25,00 aplicado")
  );

export const getOpeningConditionFee = (request) => {
  const line = request?.pricing_calculation?.lines?.find(item => item.label === 'Adicional de condição da abertura');
  if (line) return Number(line.value) || 0;
  const match = request?.description?.match(/Adicional único de R\$ ([\d.,]+) aplicado/);
  if (match) return Number(match[1].replace(/\./g, '').replace(',', '.')) || 0;
  if (request?.pricing_calculation) return 0;
  return hasOpeningConditionFee(request) ? OPENING_CONDITION_FEE : 0;
};

export const locksmithAddedConditionFee = (request) =>
  hasLocksmithConditionCorrection(request) && /Adicional único de R\$ [\d.,]+ aplicado/.test(request?.description || '');