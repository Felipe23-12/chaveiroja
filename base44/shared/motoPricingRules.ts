const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sameModel = (a, b) => normalize(a.make) === normalize(b.make) && normalize(a.model) === normalize(b.model);
export const motoModels = {
  Honda: ['Pop 110i', 'Biz 125', 'CG 160', 'NXR 160 Bros', 'CB 300F Twister', 'XRE 300', 'PCX 160', 'SH 150 / SH 300', 'ADV 350', 'CB 500 (acima de 300cc)', 'XRE 190/750/1000 (acima de 300cc)'],
  Yamaha: ['Neo 125', 'Factor 150', 'Crosser / XTZ 150', 'Fazer 250', 'Lander 250', 'NMAX 160', 'XMAX 250', 'MT-03 / R3 (acima de 300cc)', 'MT-07 (acima de 300cc)'],
};
// Intervalos observados no histórico público fipeX (ano-modelo). Modelos compostos sem correspondência ficam indisponíveis até revisão.
export const motoYearRanges = {
  Honda: { 'Pop 110i': [2016, 2027], 'Biz 125': [2006, 2027], 'CG 160': [2016, 2026], 'NXR 160 Bros': [2015, 2026], 'CB 300F Twister': [2023, 2027], 'XRE 300': [2010, 2023], 'PCX 160': [2023, 2027], 'SH 150 / SH 300': [2016, 2021], 'CB 500 (acima de 300cc)': [1997, 2027] },
  Yamaha: { 'Neo 125': [2017, 2025], 'Factor 150': [2016, 2026], 'Crosser / XTZ 150': [2014, 2027], 'Fazer 250': [2006, 2026], 'Lander 250': [2007, 2026], 'NMAX 160': [2017, 2026], 'XMAX 250': [2020, 2025], 'MT-03 / R3 (acima de 300cc)': [2017, 2027], 'MT-07 (acima de 300cc)': [2015, 2026] },
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
    const first = Number(rule.year_start), last = Number(rule.year_end), range = motoYearRanges[make]?.[model], max = Math.min(range?.[1] || 0, new Date().getFullYear() + 1);
    if (!range) throw new Error(`Regra de moto ${index + 1}: faixa de ano-modelo desse modelo ainda não confirmada.`);
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < range[0] || last > max || first > last) throw new Error(`Regra de moto ${index + 1}: use anos-modelo de ${range[0]} a ${max}.`);
    const percent = Number(rule.percent_adjustment);
    if (rule.percent_adjustment === '' || rule.percent_adjustment == null || !Number.isFinite(percent) || percent < -90 || percent > 500) throw new Error(`Regra de moto ${index + 1}: ajuste percentual entre -90% e +500%.`);
    if (seen.some(item => sameModel(item, { make, model }) && first <= item.year_end && last >= item.year_start)) throw new Error(`Faixas de anos sobrepostas para ${make} ${model}.`);
    const valid = { make, model, year_start: first, year_end: last, percent_adjustment: Math.round(percent * 100) / 100 };
    seen.push(valid);
    return valid;
  });
}
