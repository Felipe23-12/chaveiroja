import { pricingCalendar } from './servicePricingConditions.ts';
export const CANCELLATION_POLICY_VERSION = '2026-09-28';
export const KEY_CANCELLATION_FEES = { business: { standard: 80, above1000: 150 }, other: { standard: 150, above1000: 200 } };
export function cancellationFee(price, { serviceType = '', now = new Date() } = {}) {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Valor do serviço inválido para calcular cancelamento');
  const fixed = ['Confecção de Chave de Carro', 'Confecção de Chave de Moto'].includes(serviceType);
  const businessHours = pricingCalendar({}, now).businessHours;
  const fees = KEY_CANCELLATION_FEES[businessHours ? 'business' : 'other'];
  const fee = fixed ? fees[amount > 1000 ? 'above1000' : 'standard'] : Math.round(amount * 25) / 100;
  const locksmithAmount = Math.round(fee * 80) / 100;
  return { fee, fixed, locksmithAmount, appFee: Math.round((fee - locksmithAmount) * 100) / 100, businessHours, policyVersion: CANCELLATION_POLICY_VERSION };
}
