export function findServicePayment(payments, requestId) {
  const matches = (payments || []).filter((payment) => payment.service_request_id === requestId);
  return matches.find((payment) => ["paid", "captured"].includes(payment.status)) || matches[0] || null;
}

export function getServiceDeductions(request, payment, isAppMode = true) {
  const chargedAmount = Number(payment?.amount ?? request?.price) || 0;
  const loyaltyDiscount = Math.max(0, Number(request?.discount_amount) || 0);
  const originalAmount = Math.round((chargedAmount + loyaltyDiscount) * 100) / 100;
  const baseCommission = isAppMode ? Math.round(chargedAmount * 0.15 * 100) / 100 : 0;
  const totalCommission = payment && ["paid", "captured", "pre_authorized"].includes(payment.status)
    ? Math.max(baseCommission, Number(payment.commission_amount) || 0)
    : baseCommission;
  const previousDebt = Math.max(0, Math.round((totalCommission - baseCommission) * 100) / 100);
  const providerFee = Math.max(0, Number(payment?.provider_fee_amount) || 0);
  const netAmount = Math.max(0, Math.round((chargedAmount - totalCommission - providerFee) * 100) / 100);
  return { originalAmount, loyaltyDiscount, chargedAmount, baseCommission, previousDebt, providerFee, totalCommission, netAmount };
}