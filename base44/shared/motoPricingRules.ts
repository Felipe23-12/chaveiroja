const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sameModel = (a, b) => normalize(a.make) === normalize(b.make) && normalize(a.model) === normalize(b.model);
export const motoModels = {
  Honda: ['Pop 110i', 'Biz 125', 'CG 160', 'NXR 160 Bros', 'CB 300F Twister', 'XRE 300', 'PCX 160', 'SH 150 / SH 300', 'ADV 350', 'CB 500 (acima de 300cc)', 'XRE 190/750/1000 (acima de 300cc)'],
  Yamaha: ['Neo 125', 'Factor 150', 'Crosser / XTZ 150', 'Fazer 250', 'Lander 250', 'NMAX 160', 'XMAX 250', 'MT-03 / R3 (acima de 300cc)', 'MT-07 (acima de 300cc)'],
};
export function matchingMotoRule(make, model, year, rules = []) {
  return rules.find(rule => sameModel(rule, { make, model }) && Number(year) >= rule.year_start && Number(year) <= rule.year_end) || null;
}
export function validateMotoPricingRules(rules) {
  if (!Array.isArray(rules) || rules.length > 1000) throw new Error('Informe até 1.000 regras de preço de moto.');
  const seen = [];
  return rules.map((rule, index) => {
    const make = Object.keys(motoModels).find(item => normalize(item) === normalize(rule?.make));
    const model = make && motoModels[make].find(item => normalize(item) === normalize(rule?.model));
    if (!make || !model) throw new Error(`Regra de moto ${index + 1}: escolha marca e modelo disponíveis.`);
    const first = Number(rule.year_start), last = Number(rule.year_end), max = new Date().getFullYear() + 1;
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1980 || last > max || first > last) throw new Error(`Regra de moto ${index + 1}: informe anos-modelo de 1980 a ${max}, com início até o fim.`);
    const percent = Number(rule.percent_adjustment);
    if (rule.percent_adjustment === '' || rule.percent_adjustment == null || !Number.isFinite(percent) || percent < -90 || percent > 500) throw new Error(`Regra de moto ${index + 1}: ajuste percentual entre -90% e +500%.`);
    if (seen.some(item => sameModel(item, { make, model }) && first <= item.year_end && last >= item.year_start)) throw new Error(`Faixas de anos sobrepostas para ${make} ${model}.`);
    const valid = { make, model, year_start: first, year_end: last, percent_adjustment: Math.round(percent * 100) / 100 };
    seen.push(valid);
    return valid;
  });
}
