const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const makeKey = value => ({ gm: 'chevrolet', gmchevrolet: 'chevrolet', chevroletgm: 'chevrolet', vw: 'volkswagen' }[normalize(value)] || normalize(value));
const sameModel = (a, b) => makeKey(a.make) === makeKey(b.make) && normalize(a.model) === normalize(b.model);
const startYear = rule => rule.year_start ?? rule.year;
const endYear = rule => rule.year_end ?? rule.year;
export const vehicleKeyPriceFields = ['original_price', 'parallel_simple_price', 'parallel_flip_price', 'parallel_proximity_price'];

export function matchingVehicleRule(make, model, year, rules = []) {
  return rules.find(rule => sameModel(rule, { make, model }) && Number(year) >= startYear(rule) && Number(year) <= endYear(rule));
}

export function vehicleManualKeyPrice(rule, keyType, origin) {
  const field = origin === 'original' ? 'original_price' : keyType === 'simples' ? 'parallel_simple_price' : keyType === 'presenca' ? 'parallel_proximity_price' : 'parallel_flip_price';
  const value = rule?.[field];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function validateVehicleFipeRates(rules) {
  if (!Array.isArray(rules) || rules.length > 1000) throw new Error('Informe até 1.000 regras de FIPE por veículo.');
  const seen = [];
  return rules.map((rule, index) => {
    if (!rule || typeof rule.make !== 'string' || !normalize(rule.make) || rule.make.length > 100 || typeof rule.model !== 'string' || !normalize(rule.model) || rule.model.length > 150) throw new Error(`Regra ${index + 1}: informe a montadora e o modelo.`);
    const first = startYear(rule), last = endYear(rule);
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1900 || last > 2200 || first > last) throw new Error(`Regra ${index + 1}: informe anos de 1900 a 2200, com ano final igual ou posterior ao inicial.`);
    if (typeof rule.percent !== 'number' || !Number.isFinite(rule.percent) || rule.percent < 0 || rule.percent > 10) throw new Error(`Regra ${index + 1}: informe um percentual de 0 a 10% da FIPE.`);
    if (seen.some(item => sameModel(item, rule) && first <= item.year_end && last >= item.year_start)) throw new Error(`Existem faixas de anos sobrepostas para ${rule.make} ${rule.model}.`);
    const result = { make: rule.make.trim(), model: rule.model.trim(), year_start: first, year_end: last, percent: Math.round(rule.percent * 100) / 100 };
    for (const field of vehicleKeyPriceFields) {
      const value = rule[field];
      if (value == null || value === '') continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 20000) throw new Error(`Regra ${index + 1}: preço da chave deve estar entre R$ 0 e R$ 20.000.`);
      result[field] = Math.round(value * 100) / 100;
    }
    seen.push(result);
    return result;
  });
}

export function vehicleFipeRate(make, model, year, coded, settings, rules = []) {
  const specific = matchingVehicleRule(make, model, year, rules);
  if (specific) return { percent: specific.percent, label: `regra específica: ${specific.make} ${specific.model} ${startYear(specific)}–${endYear(specific)}` };
  const brand = makeKey(make);
  const jetta = brand === 'volkswagen' && /\bjetta\b/i.test(model);
  const rateKey = jetta && year >= 2015 && year <= 2019 ? 'fipe_jetta_2015'
    : jetta && year >= 2020 && year <= 2022 ? 'fipe_jetta_2020'
    : brand === 'chevrolet' && year >= 2020 ? 'fipe_chevrolet_2020'
    : year >= 2020 ? 'fipe_2020' : year >= 2010 ? 'fipe_2010' : year >= 2000 ? 'fipe_2000' : coded ? 'fipe_old_coded' : 'fipe_old_plain';
  return { percent: settings[rateKey], label: null };
}