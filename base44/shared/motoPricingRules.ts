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
const motoDetails = {
  'Pop 110i': { cc: 110 }, 'Biz 125': { cc: 125 }, 'CG 160': { cc: 160 }, 'NXR 160 Bros': { cc: 160 },
  'CB 300F Twister': { cc: 300 }, 'XRE 300': { cc: 300 }, 'PCX 160': { cc: 160, premium: true },
  'SH 150 / SH 300': { cc: 300, premium: true }, 'ADV 350': { cc: 350, premium: true },
  'CB 500 (acima de 300cc)': { cc: 500 }, 'XRE 190/750/1000 (acima de 300cc)': { cc: 750 },
  'Neo 125': { cc: 125 }, 'Factor 150': { cc: 150 }, 'Crosser / XTZ 150': { cc: 150 },
  'Fazer 250': { cc: 250 }, 'Lander 250': { cc: 250 }, 'NMAX 160': { cc: 160, premium: true },
  'XMAX 250': { cc: 250, premium: true }, 'MT-03 / R3 (acima de 300cc)': { cc: 320 }, 'MT-07 (acima de 300cc)': { cc: 690 },
};
export function validateMotoServiceRequest(vehicle, keyType, hasPassword) {
  const make = Object.keys(motoModels).find(item => normalize(item) === normalize(vehicle?.make));
  const model = make && motoModels[make].find(item => normalize(item) === normalize(vehicle?.model));
  if (!make || !model) throw new Error('Selecione uma marca e um modelo de moto disponíveis.');
  const year = Number(vehicle?.year), max = new Date().getFullYear() + 1;
  const range = motoYearRanges[make]?.[model];
  if (!range) throw new Error('A faixa de anos-modelo desta moto ainda não está confirmada para solicitar o serviço.');
  const last = Math.min(range[1], max);
  if (!Number.isInteger(year) || year < range[0] || year > last) throw new Error(`Informe um ano-modelo de ${make} ${model} entre ${range[0]} e ${last}.`);
  if (!['simples', 'presenca'].includes(keyType)) throw new Error('Selecione um tipo de chave de moto válido.');
  const detail = motoDetails[model];
  if (keyType === 'presenca') {
    if (!detail?.premium) throw new Error('Este modelo não utiliza chave presença. Selecione chave simples.');
    if (typeof hasPassword !== 'boolean') throw new Error('Informe se possui a senha da chave presença.');
  }
  if (detail?.premium && keyType === 'simples' && year > 2022) throw new Error('Modelos premium acima de 2022 utilizam chave presença.');
  if (!detail?.premium && detail?.cc > 300) throw new Error('Motos acima de 300 cilindradas são atendidas somente no Modo Livre.');
  return { make, model, year };
}
export function motoServiceBaseRange(vehicle, keyType, hasPassword) {
  const detail = motoDetails[vehicle.model];
  const year = Number(vehicle.year);
  if (detail?.premium) {
    if (keyType === 'simples' || hasPassword === true) return [500, 700];
    return year <= 2023 ? [700, 950] : [950, 1300];
  }
  return year >= 2022 ? [300, 500] : [200, 500];
}
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
