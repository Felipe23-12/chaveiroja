const round = (value: number) => Math.round(value * 100) / 100;
export const EMERGENCY_LOCAL_RADIUS_KM = 10;
export const DISTANT_EMERGENCY_EXTRA_MINUTES = 15;

// Reaplica somente o deslocamento. Horário, chuva, FIPE e a tarifa por km
// permanecem os da cotação; piso, descontos e Lishi mantêm a ordem original.
export function travelPrice(model: any, fee: number) {
  const raw = round(model.base + fee);
  const floor = round(Math.max(0, model.minimum - raw));
  const total = round(raw + floor + model.after_minimum);
  const loyalty = round(Math.max(0, total - model.protected_fees) * model.loyalty_percent / 100);
  const simple = Math.max(model.customer_minimum, round(total - loyalty));
  const lishi = round(simple * model.lishi_percent / 100);
  const beforeFirstCall = round(simple + lishi);
  const firstDiscount = model.first_call ? round(beforeFirstCall * 0.10) : 0;
  return { price: round(beforeFirstCall - firstDiscount), total: round(total + lishi),
    discount: round(total - simple + firstDiscount), simple, lishi, floor, firstDiscount };
}

export function arrivalExtraMinutes(request: any, locksmithId: string, currentDistance: number) {
  if (request?.urgency !== 'urgent') return 0;
  const initial = request.initial_locksmith_distances?.find((item: any) => item.locksmith_id === locksmithId);
  const distance = initial && Number.isFinite(initial.distance_km) ? initial.distance_km : currentDistance;
  return distance > EMERGENCY_LOCAL_RADIUS_KM ? DISTANT_EMERGENCY_EXTRA_MINUTES : 0;
}

function legacyModel(request: any, travel: any) {
  const calculation = request.pricing_calculation;
  if (!Number.isFinite(calculation?.total) || !Array.isArray(calculation?.lines)) return null;
  const value = (pattern: RegExp) => calculation.lines.filter((line: any) => pattern.test(line.label))
    .reduce((sum: number, line: any) => sum + Number(line.value || 0), 0);
  const lishi = value(/^Abertura Lishi profissional/);
  const floor = value(/^Ajuste ao piso mínimo$/);
  const total = round(calculation.total - lishi);
  const protectedFees = value(/Complexidade do veículo|Adicional Ford|Land Rover trancada no alarme|Adicional de condição da abertura/i);
  const base = round(total - Number(travel.fee || 0) - floor);
  const loyaltyPercent = request.discount_type === 'loyalty' && total > protectedFees
    ? Math.min(100, Number(request.discount_amount || 0) / (total - protectedFees) * 100) : 0;
  return { base, minimum: floor > 0 ? round(base + Number(travel.fee || 0) + floor) : 0,
    after_minimum: 0, protected_fees: protectedFees, customer_minimum: 0,
    loyalty_percent: loyaltyPercent, lishi_percent: lishi > 0 ? Number(calculation.lishi_percent || 0) : 0,
    first_call: request.discount_type === 'first_call' };
}

export function acceptedTravelPatch(request: any, locksmith: any, distance: number) {
  if (!Number.isFinite(distance) || distance < 0) throw new Error('Não foi possível confirmar a distância do atendimento.');
  const patch: any = { distance_km: round(distance), accepted_distance_km: round(distance),
    arrival_extra_minutes: arrivalExtraMinutes(request, locksmith.id, distance) };
  const calculation = request.pricing_calculation;
  const travel = calculation?.distance_pricing;
  // Chamados legados sem detalhamento de preço preservam seu valor.
  if (!travel || !Number.isFinite(Number(request.price))) return patch;
  const threshold = Number(travel.threshold_km);
  const rate = Number(travel.rate_per_km);
  if (!Number.isFinite(threshold) || threshold < 0 || !Number.isFinite(rate) || rate < 0) return patch;
  const fee = round(Math.max(0, distance - threshold) * rate);
  const model = travel.price_model || legacyModel(request, travel);
  if (!model) return patch;
  const before = travelPrice(model, Number(travel.fee || 0));
  const after = travelPrice(model, fee);
  // Preserva ajustes de preço independentes que já façam parte do chamado.
  const priceDelta = round(after.price - before.price);
  const grossDelta = round(after.total - before.total);
  const lines = (calculation.lines || []).filter((line: any) =>
    !/^(Locomoção|Deslocamento do chaveiro|Ajuste ao piso mínimo|Abertura Lishi profissional|Desconto no primeiro chamado)/.test(line.label));
  if (after.floor) lines.push({ label: 'Ajuste ao piso mínimo', value: after.floor });
  if (fee) lines.push({ label: 'Deslocamento do chaveiro', value: fee });
  if (after.lishi) lines.push({ label: `Abertura Lishi profissional (+${model.lishi_percent}% sobre o total final da abertura simples)`, value: after.lishi });
  if (after.firstDiscount) lines.push({ label: 'Desconto no primeiro chamado (10%)', value: -after.firstDiscount });
  Object.assign(patch, { price: round(Number(request.price) + priceDelta), locomotion_cost: fee,
    discount_amount: round(Number(request.discount_amount || 0) + after.discount - before.discount),
    extra_cost: round(Number(request.extra_cost || 0) + after.lishi - before.lishi),
    pricing_calculation: { ...calculation, total: round(calculation.total + grossDelta), lines,
      ...(calculation.simple_opening_price != null ? { simple_opening_price: after.simple } : {}),
      distance_pricing: { ...travel, distance_km: round(distance), excess_km: round(Math.max(0, distance - threshold)),
        fee, basis: 'accepted_locksmith', locksmith_id: locksmith.id, price_model: model } } });
  return patch;
}
