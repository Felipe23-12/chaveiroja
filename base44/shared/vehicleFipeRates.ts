const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const makeKey = value => ({ gm: 'chevrolet', gmchevrolet: 'chevrolet', chevroletgm: 'chevrolet', vw: 'volkswagen' }[normalize(value)] || normalize(value));
const ruleKey = rule => `${makeKey(rule.make)}:${normalize(rule.model)}:${Number(rule.year)}`;

export function validateVehicleFipeRates(rules) {
  if (!Array.isArray(rules) || rules.length > 1000) throw new Error('Informe até 1.000 regras de FIPE por veículo.');
  const seen = new Set();
  return rules.map((rule, index) => {
    if (!rule || typeof rule.make !== 'string' || !normalize(rule.make) || rule.make.length > 100 || typeof rule.model !== 'string' || !normalize(rule.model) || rule.model.length > 150) throw new Error(`Regra ${index + 1}: informe a montadora e o modelo.`);
    if (!Number.isInteger(rule.year) || rule.year < 1900 || rule.year > 2200) throw new Error(`Regra ${index + 1}: informe um ano entre 1900 e 2200.`);
    if (typeof rule.percent !== 'number' || !Number.isFinite(rule.percent) || rule.percent < 0 || rule.percent > 10) throw new Error(`Regra ${index + 1}: informe um percentual de 0 a 10% da FIPE.`);
    const key = ruleKey(rule);
    if (seen.has(key)) throw new Error(`Existe mais de uma regra para ${rule.make} ${rule.model} ${rule.year}. Mantenha somente uma.`);
    seen.add(key);
    return { make: rule.make.trim(), model: rule.model.trim(), year: rule.year, percent: Math.round(rule.percent * 100) / 100 };
  });
}

export function vehicleFipeRate(make, model, year, coded, settings, rules = []) {
  const key = ruleKey({ make, model, year });
  const specific = rules.find(rule => ruleKey(rule) === key);
  if (specific) return { percent: specific.percent, label: `regra específica: ${specific.make} ${specific.model} ${specific.year}` };
  const brand = makeKey(make);
  const jetta = brand === 'volkswagen' && /\bjetta\b/i.test(model);
  const rateKey = jetta && year >= 2015 && year <= 2019 ? 'fipe_jetta_2015'
    : jetta && year >= 2020 && year <= 2022 ? 'fipe_jetta_2020'
    : brand === 'chevrolet' && year >= 2020 ? 'fipe_chevrolet_2020'
    : year >= 2020 ? 'fipe_2020' : year >= 2010 ? 'fipe_2010' : year >= 2000 ? 'fipe_2000' : coded ? 'fipe_old_coded' : 'fipe_old_plain';
  return { percent: settings[rateKey], label: null };
}