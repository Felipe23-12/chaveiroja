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

export const getOpeningConditionFee = (request) =>
  hasOpeningConditionFee(request) ? OPENING_CONDITION_FEE : 0;

export const locksmithAddedConditionFee = (request) =>
  hasLocksmithConditionCorrection(request) && request?.description?.includes("Adicional único de R$ 25,00 aplicado");