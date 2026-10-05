// Fonte automatizada independente: Parallelum FIPE v2. A fundação FIPE não fornece API pública.
const BASE = 'https://fipe.parallelum.com.br/api/v2';
const cache = new Map<string, { expires: number; data: any }>();
const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const numberFromBrl = (value: unknown) => Number(String(value || '').replace(/[^\d,]/g, '').replace(',', '.'));
const isCarBrand = (name: string, wanted: string) => {
  const aliases: Record<string, string[]> = { vw: ['vw volkswagen', 'volkswagen'], volkswagen: ['vw volkswagen', 'volkswagen'], gm: ['gm chevrolet', 'chevrolet'], chevrolet: ['gm chevrolet', 'chevrolet'], landrover: ['land rover'], mercedes: ['mercedes benz'] };
  const variants = aliases[wanted.replace(/ /g, '')] || [wanted];
  return variants.some(item => normalize(name) === item || normalize(name).split(' ').join('') === item.split(' ').join(''));
};
async function get(path: string, reference?: string) {
  const url = BASE + path + (reference ? '?reference=' + encodeURIComponent(reference) : '');
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.data;
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (response.status === 429) throw Object.assign(new Error('A consulta FIPE está temporariamente indisponível porque a fonte atingiu o limite de consultas. Não foi possível confirmar o valor deste veículo. Tente novamente mais tarde.'), { code: 'FIPE_RATE_LIMIT', status: 429 });
  if (!response.ok) throw Object.assign(new Error('A fonte FIPE está temporariamente indisponível. Tente novamente mais tarde.'), { code: 'FIPE_UNAVAILABLE', status: 503 });
  const data = await response.json();
  cache.set(url, { expires: Date.now() + (path === '/references' ? 60 * 60 * 1000 : 30 * 60 * 1000), data });
  return data;
}
export async function lookupExactFipe(make: string, model: string, year: string | number, version = '') {
  const references = await get('/references');
  const reference = references?.[0];
  if (!/^\d+$/.test(String(reference?.code)) || !reference?.month) throw new Error('Mês de referência FIPE indisponível.');
  const brands = await get('/cars/brands', reference.code);
  const brand = brands.find((row: any) => isCarBrand(row.name, normalize(make)));
  if (!brand) throw new Error('Montadora não localizada na fonte FIPE automatizada.');
  const models = await get('/cars/brands/' + encodeURIComponent(brand.code) + '/models', reference.code);
  const wanted = normalize(model);
  const matches = models.filter((row: any) => {
    const name = normalize(row.name);
    return name === wanted || name.startsWith(wanted + ' ');
  });
  const needle = normalize(version);
  const selected = needle ? matches.filter((row: any) => normalize(row.name).includes(needle)) : matches;
  if (selected.length !== 1) {
    const options = (selected.length ? selected : matches).slice(0, 6).map((row: any) => row.name).join('; ');
    throw new Error(selected.length ? 'Há mais de uma versão FIPE. Informe a versão exata: ' + options : 'Versão não localizada na FIPE' + (options ? '. Exemplos: ' + options : '.'));
  }
  const years = await get('/cars/brands/' + encodeURIComponent(brand.code) + '/models/' + encodeURIComponent(selected[0].code) + '/years', reference.code);
  const matchesYear = years.filter((row: any) => String(row.code).startsWith(String(year) + '-'));
  if (matchesYear.length !== 1) throw new Error('Ano-modelo e combustível não identificados de forma única para esta versão FIPE.');
  const path = '/cars/brands/' + encodeURIComponent(brand.code) + '/models/' + encodeURIComponent(selected[0].code) + '/years/' + encodeURIComponent(matchesYear[0].code);
  const result = await get(path, reference.code);
  const amount = numberFromBrl(result.price);
  if (result.modelYear !== Number(year) || !/^\d{6}-\d$/.test(String(result.codeFipe || '')) || !Number.isFinite(amount) || amount < 1000 || amount > 3000000 || !result.referenceMonth) throw new Error('Resposta FIPE incompleta ou incompatível com o ano-modelo.');
  if (normalize(result.model) !== normalize(selected[0].name) || !isCarBrand(result.brand, normalize(make))) throw new Error('Modelo ou montadora não correspondem à consulta FIPE.');
  return { value: amount, code: result.codeFipe, yearCode: matchesYear[0].code, referenceCode: String(reference.code), brand: result.brand, month: result.referenceMonth, model: result.model, sourceUrl: BASE + path + '?reference=' + encodeURIComponent(reference.code), provider: 'Parallelum (fonte independente da FIPE)' };
}