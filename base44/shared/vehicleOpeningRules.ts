import { getVehicleYearRange } from './vehicleModelYears.ts';
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sameModel = (a, b) => norm(a.make) === norm(b.make) && norm(a.model) === norm(b.model);
export function validateVehicleOpeningRules(rules) {
  if (!Array.isArray(rules) || rules.length > 1000) throw new Error('Informe até 1.000 regras de abertura por veículo.');
  const seen = [];
  return rules.map((rule, index) => {
    const range = getVehicleYearRange(rule?.make, rule?.model);
    if (!range?.min || !range?.max) throw new Error(`Abertura ${index + 1}: escolha montadora e modelo com anos confirmados.`);
    const first = rule.year_start, last = rule.year_end;
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < range.min || last > Math.min(range.max, new Date().getFullYear() + 1) || first > last) throw new Error(`Abertura ${index + 1}: use anos-modelo de ${range.min} a ${Math.min(range.max, new Date().getFullYear() + 1)}.`);
    if (rule.version != null && (typeof rule.version !== 'string' || rule.version.length > 80)) throw new Error('Versão do veículo inválida.');
    const result = { make: range.make, model: range.model, year_start: first, year_end: last, version: String(rule.version || '').trim() };
    for (const [field, max] of [['base_price', 100000], ['lishi_percent', 500]]) {
      const value = rule[field];
      if (value === '' || value == null) continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error(`Abertura ${index + 1}: ${field === 'base_price' ? 'preço base' : 'percentual Lishi'} deve estar entre 0 e ${max}.`);
      result[field] = Math.round(value * 100) / 100;
    }
    for (const field of ['simple_unavailable', 'lishi_unavailable']) {
      if (rule[field] != null && typeof rule[field] !== 'boolean') throw new Error('Disponibilidade da abertura inválida.');
      if (rule[field] != null) result[field] = rule[field];
    }
    if (result.base_price == null && result.lishi_percent == null && result.simple_unavailable == null && result.lishi_unavailable == null) throw new Error(`Abertura ${index + 1}: informe preço, percentual ou disponibilidade.`);
    if (seen.some(item => sameModel(item, result) && norm(item.version) === norm(result.version) && first <= item.year_end && last >= item.year_start)) throw new Error(`Faixas sobrepostas para ${result.make} ${result.model} ${result.version}.`);
    seen.push(result); return result;
  });
}
export function matchingOpeningRule(vehicle, rules = []) {
  if (vehicle?.opening_target === 'moto_seat') return null;
  const matches = rules.filter(rule => sameModel(rule, vehicle) && Number(vehicle.year) >= rule.year_start && Number(vehicle.year) <= rule.year_end && (!norm(rule.version) || norm(rule.version) === norm(vehicle.version)));
  return matches.find(rule => norm(rule.version)) || matches[0] || null;
}
export function openingMethod(vehicle) {
  const method = vehicle?.opening_method ?? 'simples';
  if (!['simples', 'lishi'].includes(method)) throw new Error('Selecione abertura simples ou abertura Lishi profissional.');
  if (vehicle?.opening_target === 'moto_seat' && method === 'lishi') throw new Error('Lishi profissional está disponível na abertura de carros.');
  return method;
}

export function openingAvailability(rule) {
  return { simples: rule?.simple_unavailable !== true, lishi: rule?.lishi_unavailable !== true };
}
export function assertOpeningAvailable(rule, method) {
  if (!openingAvailability(rule)[method]) throw new Error(`${method === 'lishi' ? 'Abertura Lishi profissional' : 'Abertura simples'} indisponível para este veículo e ano-modelo. Escolha outra opção disponível.`);
}
